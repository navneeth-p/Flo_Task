const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
const pathRoutes = require('./routes/pathRoutes');
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: 'http://localhost:3000', methods: ['GET', 'POST'] },
});

mongoose.connect('mongodb://localhost:27017/turtle_sim', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('MongoDB connected'));

app.use(express.json());
app.use('/path', pathRoutes);

let turtlePose = { x: 0, y: 0, theta: 0 };
let isMissionRunning = false;
let missionPoints = [];
let missionTargetIdx = 0;

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.emit('turtlePose', turtlePose);

  socket.on('turtleControl', ({ linear, angular }) => {
    if (!isMissionRunning) {
      turtlePose.x += linear * Math.cos(turtlePose.theta);
      turtlePose.y += linear * Math.sin(turtlePose.theta);
      turtlePose.theta += angular;
      turtlePose.x = Math.max(-10, Math.min(10, turtlePose.x));
      turtlePose.y = Math.max(-10, Math.min(10, turtlePose.y));
      io.emit('turtlePose', turtlePose);
    }
  });

  socket.on('startMission', ({ points }) => {
    if (!isMissionRunning) {
      isMissionRunning = true;
      missionPoints = points;
      missionTargetIdx = 0;
      io.emit('missionStarted', { points });
      followMission();
    }
  });

  socket.on('stopMission', () => {
    if (isMissionRunning) {
      isMissionRunning = false;
      missionPoints = [];
      missionTargetIdx = 0;
      io.emit('missionStopped');
    }
  });

  socket.on('teleportTurtle', ({ x, y, theta }) => {
    turtlePose = { x, y, theta };
    turtlePose.x = Math.max(-10, Math.min(10, turtlePose.x));
    turtlePose.y = Math.max(-10, Math.min(10, turtlePose.y));
    io.emit('turtlePose', turtlePose);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });

  function followMission() {
    if (!isMissionRunning || missionTargetIdx >= missionPoints.length) {
      isMissionRunning = false;
      missionPoints = [];
      missionTargetIdx = 0;
      io.emit('missionComplete');
      return;
    }

    const [targetX, targetY] = missionPoints[missionTargetIdx];
    const dx = targetX - turtlePose.x;
    const dy = targetY - turtlePose.y;
    const distance = Math.hypot(dx, dy);
    const angleToTarget = Math.atan2(dy, dx);
    const angleDiff = angleToTarget - turtlePose.theta;

    if (distance < 0.1) {
      missionTargetIdx++;
      followMission();
      return;
    }

    const angular = Math.max(-0.5, Math.min(0.5, angleDiff));
    const linear = distance > 0.2 ? 0.5 : 0.1;

    turtlePose.theta += angular * 0.1;
    turtlePose.x += linear * Math.cos(turtlePose.theta) * 0.1;
    turtlePose.y += linear * Math.sin(turtlePose.theta) * 0.1;
    turtlePose.x = Math.max(-10, Math.min(10, turtlePose.x));
    turtlePose.y = Math.max(-10, Math.min(10, turtlePose.y));

    io.emit('turtlePose', turtlePose);
    setTimeout(followMission, 100);
  }
});

server.listen(5000, () => console.log('Server running on port 5000'));