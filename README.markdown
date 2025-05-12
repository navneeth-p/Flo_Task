# Flo Mobility - Full Stack Developer Challenge

This is a full-stack mission planning and visualization application built for the Flo Mobility Full Stack Developer Challenge. It integrates a ROS 2 (Humble) Turtlesim robot simulator with a modern web-based UI for controlling a turtle, recording paths, saving stations, and executing missions. The application features real-time 3D visualization, WebSocket-based communication, and persistent storage of paths and stations.

## 🚀 Features

- **Turtle Movement Control**:
  - Control the turtle in ROS 2 Turtlesim using WebSocket commands (linear and angular velocity).
  - Real-time position and orientation updates in the UI.
- **3D Visualization**:
  - Visualize the turtle's movement, paths, and stations in a 3D canvas using React Three Fiber.
  - Neon grid for spatial reference, with colored paths and markers:
    - Teal path (`#00ffea`) during mapping.
    - Cyan path (`#00ffcc`) for selected saved paths.
    - Green start marker (`#4ade80`), yellow end marker (`#facc15`), pink intermediate stations (`#ff69f6`), white for selected stations.
- **Path and Station Management**:
  - Record paths by starting/stopping mapping.
  - Add intermediate stations during mapping.
  - Save paths with start, end, and intermediate stations to MongoDB.
  - View and select saved paths from a dropdown.
- **Mission Planning and Execution**:
  - Select a saved path and choose start or end station to execute a mission.
  - Turtle autonomously follows the path, with real-time progress tracking.
  - Stop an active mission with a dedicated button.
- **Real-time Notifications**:
  - Toast notifications for key events (e.g., "Mission started!", "Path saved successfully!", "Connected to ROS!") with 3-second duration and fade-out animation.
- **Real-time Sync**:
  - WebSocket communication ensures seamless sync between frontend, backend, and ROS 2 Turtlesim for turtle pose, mission status, and control commands.
- **Persistent Storage**:
  - Paths and stations are saved to MongoDB and persist across sessions.

## 🧱 Tech Stack

### Frontend
- **React**: UI framework for building the application.
- **React Three Fiber**: For 3D visualization of the turtle, paths, and stations.
- **Zustand**: Lightweight state management for handling turtle state, paths, missions, and UI.
- **Socket.IO-Client**: For real-time WebSocket communication with the backend.
- **Axios**: For REST API requests to save and fetch paths.
- **TypeScript**: For type-safe development.
- **CSS**: Inline styles for responsive and modern UI design.

### Backend
- **Node.js + Express.js**: REST API for path and station management.
- **MongoDB + Mongoose**: Persistent storage for paths and stations.
- **Socket.IO**: Real-time WebSocket communication with the frontend and ROS 2 simulator.
- **CORS**: Configured for secure communication with the frontend (`http://localhost:3000`).

### ROS 2 (Robot Operating System)
- **ROS 2 Humble**: Runs the `turtlesim` node for the turtle simulator.
- **Socket.IO Simulation**: The backend simulates ROS 2 Turtlesim communication via WebSocket, handling `turtlePose`, `turtleControl`, and mission events (no `rosbridge_suite` or `ros2-web-bridge` required in this setup).

## 📂 Project Structure

```
Flo_Task/
├── backend/
│   ├── models/
│   │   └── path.js             # Mongoose schema for paths and stations
│   ├── routes/
│   │   └── pathRoutes.js       # Express routes for path CRUD
│   ├── index.js                # Backend entry point (Express + Socket.IO)
│   ├── package.json            # Backend dependencies
│   └── ...
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── Scene.tsx       # Main 3D visualization and control panel
│   │   ├── App.tsx             # React app entry point
│   │   ├── App.css             # Global styles
│   │   ├── store.tsx           # Zustand store for state management
│   │   ├── utils.ts            # Utility functions (e.g., path filtering)
│   │   └── index.tsx           # ReactDOM render
│   ├── package.json            # Frontend dependencies
│   └── ...
├── README.md                   # This file
└── ...
```

## 🎥 Demo Video
A demo video showcasing the application’s features (turtle control, path recording, station saving, mission execution, and stop functionality) is available in the repository. Check the `demo/` folder or goto
   https://drive.google.com/file/d/1k_ltToS_OtvB5kAWfZE4ndxh5fSJzoem/view?usp=sharing

## ⚙️ Setup Instructions

### Prerequisites
- **Node.js** (v16 or higher)
- **MongoDB** (running locally on `mongodb://localhost:27017`)
- **ROS 2 Humble** (installed and sourced)
- **npm** (comes with Node.js)
- A modern browser (e.g., Chrome, Firefox)

### 1. Clone the Repository
```bash
git clone https://github.com/navneeth-p/Flo_Task.git
cd Flo_Task
```

### 2. Set Up ROS 2 Turtlesim
1. Ensure ROS 2 Humble is installed and sourced:
   ```bash
   source /opt/ros/humble/setup.bash
   ```
2. Start the Turtlesim node:
   ```bash
   ros2 run turtlesim turtlesim_node
   ```
   - Note: The backend simulates ROS 2 communication via Socket.IO, so no additional ROS 2 packages (e.g., `rosbridge_suite`) are required.

### 3. Set Up the Backend
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Ensure MongoDB is running:
   ```bash
   mongod
   ```
4. Start the backend server:
   ```bash
   npm start
   ```
   - The server runs on `http://localhost:5000` and connects to MongoDB at `mongodb://localhost:27017/turtle_sim`.

### 4. Set Up the Frontend
1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the frontend development server:
   ```bash
   npm start
   ```
   - The frontend runs on `http://localhost:3000` and connects to the backend via REST (`/path`) and WebSocket (`ws://localhost:5000`).

### 5. Access the Application
- Open your browser and navigate to `http://localhost:3000`.
- The UI displays a 3D canvas with a neon grid, turtle, and control panel (Path Control, Mission, Path Selection).
- Use the control panel to:
  - Start/stop mapping to record paths.
  - Add stations during mapping.
  - Save paths with names.
  - Select saved paths and execute missions from start or end stations.
  - Stop active missions.

## 🛠️ Usage

1. **Connect to ROS**:
   - On page load, the frontend connects to the backend via WebSocket, and a "Connected to ROS!" toast appears.
   - The turtle starts at position `[0, 0, 0]`.

2. **Record a Path**:
   - In the Path Control section, click "Start" to begin mapping (green start marker appears).
   - Move the turtle (simulated via backend WebSocket).
   - Click "Add Station" to add pink intermediate markers.
   - Click "Stop" to end mapping (yellow end marker set at turtle’s position).
   - A modal prompts for a path name; save or cancel.

3. **Save and View Paths**:
   - Saved paths are stored in MongoDB and listed in the "Select Path" dropdown.
   - Select a path to view its cyan path and stations (green start, yellow end, pink intermediates).

4. **Execute a Mission**:
   - Select a path from the dropdown.
   - Click the start or end marker (highlights white) to choose the mission direction.
   - Click "Start" in the Mission section to begin; a "Mission started!" toast appears.
   - The turtle follows the path autonomously.
   - Click "Stop" to halt the mission; a "Mission stopped!" toast appears.

5. **Notifications**:
   - Toasts appear for events like connection status, path saving, mission start/stop, and errors.
   - Each toast displays for 3 seconds with a fade-out animation.

## 🐛 Troubleshooting

- **Backend Fails to Start**:
  - Ensure MongoDB is running (`mongod`) and accessible at `mongodb://localhost:27017`.
  - Check for port conflicts on `5000` (`lsof -i :5000`).
  - Verify dependencies (`npm install` in `backend/`).
- **Frontend Fails to Connect**:
  - Confirm the backend is running (`http://localhost:5000`).
  - Check browser console for WebSocket or API errors.
  - Ensure CORS is configured (`http://localhost:3000` in `index.js`).
- **Turtle Doesn’t Move**:
  - Verify Turtlesim is running (`ros2 run turtlesim turtlesim_node`).
  - Check WebSocket connection (toast should show "Connected to ROS!").
  - Inspect backend logs for `turtleControl` or `turtlePose` events.
- **Stations or Paths Not Saved**:
  - Check MongoDB (`mongo`, `use turtle_sim`, `db.paths.find().pretty()`) for saved paths and stations.
  - Verify `/path/savePath` and `/path/paths` API responses in the browser’s network tab.
- **Compilation Errors**:
  - Ensure TypeScript dependencies are installed (`ts-loader`, `@babel/preset-typescript`).
  - Share `package.json`, `tsconfig.json`, or `webpack.config.js` for debugging.

For additional help, check the repository’s issues or contact the developer.

## 📝 Notes

- **ROS 2 Integration**: The backend simulates ROS 2 Turtlesim communication using Socket.IO for simplicity. In a production environment, integrate `rosbridge_suite` for direct ROS 2 WebSocket communication.
- **TypeScript**: The frontend uses TypeScript for type safety, with fixes for common errors (`TS2322`, `TS18048`).
- **Responsive Design**: The UI uses `clamp` for font sizes and flexible layouts to support various screen sizes.
- **Future Improvements**:
  - Add pause/resume mission functionality.
  - Implement keyboard controls for turtle movement.
  - Enhance 3D visualization with camera controls (zoom, pan).
  - Add unit tests for frontend and backend.

## 👨‍💻 Author
- **Navneeth P**  
  GitHub: [navneeth-p](https://github.com/navneeth-p)  
  Developed for the Flo Mobility Full Stack Developer Challenge.