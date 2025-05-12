import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import rclnodejs from 'rclnodejs';
import path from 'path';
import fs from 'fs';


import pathRoutes from './routes/pathRoutes.js';
import stationRoutes from './routes/stationRoutes.js';


// MongoDB connection
mongoose.connect('mongodb://localhost:27017/turtle_sim', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB');
}).catch((err) => {
  console.error('MongoDB connection error:', err);
});

const app = express();

app.use(cors({
  origin: 'http://localhost:3000', // Allow requests from frontend
  methods: ['GET', 'POST'],
}));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Routes
app.use('/path', pathRoutes);
app.use('/station', stationRoutes);

let node;
let turtlePoseSub;
let turtleVelPub;
let isROSInitialized = false;
let currentMission = null;
let missionInterval = null;

async function initROS2() {
  try {
    // Initialize ROS 2 node
    await rclnodejs.init();
    node = rclnodejs.createNode('turtle_control_node');

    // Subscribe to turtle pose
    turtlePoseSub = node.createSubscription(
      'turtlesim/msg/Pose',
      '/turtle1/pose',
      (msg) => {
        io.emit('turtlePose', {
          x: msg.x,
          y: msg.y,
          theta: msg.theta
        });

        // Update current pose for mission
        if (currentMission) {
          currentMission.currentPose = {
            x: msg.x,
            y: msg.y,
            theta: msg.theta
          };
        }

        // Check if we're on a mission
        if (currentMission && currentMission.points.length > 0) {
          const currentPoint = currentMission.points[0];
          const distance = Math.sqrt(
            Math.pow(msg.x - currentPoint[0], 2) + 
            Math.pow(msg.y - currentPoint[1], 2)
          );

          if (distance < 0.1) {
            currentMission.points.shift();
            if (currentMission.points.length === 0) {
              // Mission complete
              clearInterval(missionInterval);
              currentMission = null;
              io.emit('missionComplete');
              stopTurtle();
              console.log('Mission completed');
            }
          }
        }
      }
    );

    // Publisher for turtle velocity
    turtleVelPub = node.createPublisher(
      'geometry_msgs/msg/Twist',
      '/turtle1/cmd_vel'
    );

    // Start spinning the node
    node.spin();
    isROSInitialized = true;
    console.log('ROS 2 node initialized successfully');
    
  } catch (error) {
    console.error('Error initializing ROS 2:', error);
    isROSInitialized = false;
  }
}

function normalizeAngle(angle) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function moveToPoint(point) {
  if (!isROSInitialized || !turtleVelPub || !currentMission) return;

  const twist = {
    linear: {
      x: 0,
      y: 0,
      z: 0
    },
    angular: {
      x: 0,
      y: 0,
      z: 0
    }
  };

  const dx = point[0] - currentMission.currentPose.x;
  const dy = point[1] - currentMission.currentPose.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);
  const angleDifference = normalizeAngle(angle - currentMission.currentPose.theta);

  // If the angle difference is large, rotate in place
  if (Math.abs(angleDifference) > 0.2) {
    twist.linear.x = 0;
    twist.angular.z = Math.sign(angleDifference) * Math.min(Math.abs(angleDifference), 1.0);
  } else if (distance > 0.1) {
    twist.linear.x = Math.min(1.0, distance);
    twist.angular.z = Math.sign(angleDifference) * Math.min(Math.abs(angleDifference), 1.0);
  }

  turtleVelPub.publish(twist);
}

if (currentMission) {
  console.log("Mission already in progress.");

}

function stopTurtle() {
  if (!turtleVelPub) return;
  turtleVelPub.publish({
    linear: { x: 0, y: 0, z: 0 },
    angular: { x: 0, y: 0, z: 0 }
  });
}

// Place this at the top level, not inside io.on('connection')
process.on('SIGINT', async () => {
  console.log('Shutting down ROS 2 node...');
  if (node) {
    await node.destroy();
  }
  rclnodejs.shutdown();
  process.exit(0);
});

io.on('connection', (socket) => {
  console.log('Client connected');

  socket.on('turtleControl', (data) => {
    if (!isROSInitialized || !turtleVelPub) {
      console.log('ROS 2 not initialized yet, ignoring command');
      return;
    }

    try {
      const twist = {
        linear: {
          x: data.linear,
          y: 0,
          z: 0
        },
        angular: {
          x: 0,
          y: 0,
          z: data.angular
        }
      };
      turtleVelPub.publish(twist);
      console.log('Published twist command:', { linear: data.linear, angular: data.angular });
    } catch (error) {
      console.error('Error publishing twist command:', error);
    }
  });

  socket.on('startMission', (path) => {
    if (!Array.isArray(path.points)) {
      console.error("Invalid mission data received");
      return;
    }

    if (!isROSInitialized) {
      console.log('ROS 2 not initialized yet, cannot start mission');
      return;
    }

    currentMission = {
      points: [...path.points],
      currentPose: { x: 0, y: 0, theta: 0 }
    };

    // Update mission progress every 100ms
    missionInterval = setInterval(() => {
      if (currentMission && currentMission.points.length > 0) {
        moveToPoint(currentMission.points[0]);
      }
    }, 100);
    console.log(`Starting mission with ${path.points.length} waypoints`);
  });

  if (currentMission) {
    stopTurtle();
    clearInterval(missionInterval);
    console.log('Previous mission stopped');
  }
  

  socket.on('stopMission', () => {
    if (missionInterval) {
      clearInterval(missionInterval);
      missionInterval = null;
    }
    currentMission = null;
    stopTurtle();
    io.emit('missionStopped');
  });


  socket.on('disconnect', () => {
    console.log('Client disconnected');
    if (missionInterval) {
      clearInterval(missionInterval);
      missionInterval = null;
    }
    currentMission = null;
    stopTurtle();
  });
});

// Initialize ROS 2
initROS2().catch((err) => {
  console.error('Error in ROS 2 initialization:', err);
});


const PORT = 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 