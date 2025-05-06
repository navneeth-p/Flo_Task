# Flo Mobility - Full Stack Developer Challenge

This is a full-stack mission planning and visualization application built for the Flo Mobility Full Stack Developer Challenge. It integrates a ROS 2 (Humble) Turtlesim robot simulator with a modern web-based UI for robot control, path recording, station saving, and mission execution.

## 🚀 Features

- **Turtle Movement Controls**: Use keyboard or on-screen arrows to control the turtle in ROS 2 Turtlesim.
- **3D Visualization**: Turtle’s movement is mirrored in real-time using React Three Fiber.
- **Station and Path Management**:
  - Save stations (checkpoints).
  - Record and save paths between stations.
  - View saved stations and paths.
- **Mission Planning**:
  - Select a saved path and execute a mission.
  - The turtle follows the path from the selected station.
- **Real-time Sync**: Movement and mission execution synced between frontend, backend, and ROS 2 simulator.

---

## 🧱 Tech Stack

### Frontend
- **React** + **React Three Fiber** for 3D visualization
- **CSS** for styling
- **Axios** for API requests

### Backend
- **Express.js** for REST API
- **MongoDB** with Mongoose for storage (paths, stations, missions)
- **WebSocket** for real-time updates

### ROS 2 (Robot Operating System)
- **ROS 2 Humble** with `turtlesim`
- **rosbridge_suite** for WebSocket communication with frontend
- **ros2-web-bridge** (if needed for direct JSON bridge from frontend)

---

---

## ⚙️ Setup Instructions

### 1. Clone the Repository
```bash
git clone https://github.com/navneeth-p/Flo_Task.git
cd Flo_Task

source /opt/ros/humble/setup.bash
ros2 run turtlesim turtlesim_node

cd backend
npm install
npm start

cd frontend
npm install
npm start


---

