import { create } from 'zustand';
import io, { Socket } from 'socket.io-client';
import axios from 'axios';
import { clampTurtlePoint, filterPathPoints } from './utils';

interface TurtlePose {
  x: number;
  y: number;
  theta: number;
}

interface Station {
  position: [number, number, number];
  id: string;
}

interface Path {
  points: [number, number, number][];
  id: string;
  name: string;
  stations?: Station[];
}

interface AppState {
  // Turtle state
  turtlePose: TurtlePose;
  turtlePosition: [number, number, number];
  turtleRotation: number;
  setTurtlePose: (pose: TurtlePose) => void;

  // Paths and mapping
  paths: Path[];
  currentPath: [number, number, number][];
  isMapping: boolean;
  startingStation: Station | null;
  stationsOnPath: Station[];
  pendingPath: [number, number, number][] | null;
  pendingDefaultName: string;
  setPaths: (paths: Path[]) => void;
  setStartingStation: () => void;
  startMapping: () => void;
  stopMapping: () => void;
  saveNamedPath: (name: string) => Promise<void>;
  cancelNamedPath: () => void;

  // Mission
  selectedPathId: string | null;
  selectedStation: string | null;
  isMissionRunning: boolean;
  missionPath: [number, number][] | null;
  missionTargetIdx: number;
  setSelectedPathId: (id: string | null) => void;
  setSelectedStation: (station: string | null) => void;
  startMission: () => void;
  stopMission: () => void;

  // Socket and connection
  socket: Socket | null;
  connected: boolean;
  error: string | null;
  loading: boolean;
  initializeSocket: () => void;
  publishVelocity: (linear: number, angular: number) => void;

  // UI
  toast: string | null;
  showNameModal: boolean;
  showToast: (msg: string) => void;
  setShowNameModal: (show: boolean) => void;
}

export const useStore = create<AppState>((set, get) => {
  let toastTimeout: NodeJS.Timeout | null = null; // Track active toast timer

  return {
    // Turtle state
    turtlePose: { x: 0, y: 0, theta: 0 },
    turtlePosition: [0, 0, 0],
    turtleRotation: 0,
    setTurtlePose: (pose) =>
      set((state) => {
        const newPoint: [number, number, number] = [pose.x, pose.y, 0];
        // Only add new point if mapping and it's different from the last point
        let updatedPath = state.currentPath;
        if (
          state.isMapping &&
          (!state.currentPath.length ||
            state.currentPath[state.currentPath.length - 1][0] !== newPoint[0] ||
            state.currentPath[state.currentPath.length - 1][1] !== newPoint[1])
        ) {
          updatedPath = [...state.currentPath, newPoint];
        }
        return {
          ...state,
          turtlePose: pose,
          turtlePosition: newPoint,
          turtleRotation: pose.theta,
          currentPath: updatedPath,
        };
      }),

    // Paths and mapping
    paths: [],
    currentPath: [],
    isMapping: false,
    startingStation: null,
    stationsOnPath: [],
    pendingPath: null,
    pendingDefaultName: '',
    setPaths: (paths) => set({ paths }),
    setStartingStation: () =>
      set((state) => {
        const teddy: [number, number, number] = [state.turtlePose.x, state.turtlePose.y, 0];
        const newStation = { position: teddy, id: 'start' };
        // Teleport turtle to new station position
        if (state.socket && state.connected) {
          state.socket.emit('teleportTurtle', { x: teddy[0], y: teddy[1], theta: 0 });
        }
        if (!state.isMapping) {
          // Set starting station
          return {
            startingStation: newStation,
            stationsOnPath: [newStation],
            turtlePose: { x: teddy[0], y: teddy[1], theta: 0 },
            turtlePosition: teddy,
            turtleRotation: 0,
            selectedStation: 'start', // Auto-select the new station
          };
        } else {
          // Add intermediate station
          const newId = `station-${state.stationsOnPath.length}`;
          return {
            stationsOnPath: [...state.stationsOnPath, { position: teddy, id: newId }],
            selectedStation: newId, // Auto-select the new station
          };
        }
      }),
    startMapping: () =>
      set((state) => {
        const teddy: [number, number, number] = [state.turtlePose.x, state.turtlePose.y, 0];
        return {
          isMapping: true,
          startingStation: { position: teddy, id: 'start' },
          stationsOnPath: [{ position: teddy, id: 'start' }],
          currentPath: [teddy],
          selectedStation: 'start',
        };
      }),
    stopMapping: () => {
      const { currentPath, paths, stationsOnPath, turtlePose } = get();
      if (currentPath.length < 2) {
        set({
          isMapping: false,
          currentPath: [],
          stationsOnPath: [],
          startingStation: null,
          showNameModal: false,
        });
        get().showToast('Path too short to save.');
        return;
      }
      const filteredPath = filterPathPoints(currentPath);
      const finalStations: Station[] = [
        ...stationsOnPath,
        { position: [turtlePose.x, turtlePose.y, 0] as [number, number, number], id: 'end' },
      ];
      set({
        isMapping: false,
        pendingPath: filteredPath,
        pendingDefaultName: `Path ${paths.length + 1}`,
        showNameModal: true,
        currentPath: [],
        stationsOnPath: finalStations,
        startingStation: null,
        selectedStation: 'end', // Auto-select end station
      });
    },
    saveNamedPath: async (name) => {
      const { pendingPath, stationsOnPath, paths } = get();
      if (!pendingPath) return;
      const newPath: Path = {
        points: pendingPath,
        id: Date.now().toString(),
        name,
        stations: stationsOnPath,
      };
      set({
        paths: [...paths, newPath],
        showNameModal: false,
        pendingPath: null,
        pendingDefaultName: '',
        stationsOnPath: [],
        selectedPathId: newPath.id, // Auto-select the new path
      });
      try {
        await axios.post('http://localhost:5000/path/savePath', {
          name: newPath.name,
          points: newPath.points.map(clampTurtlePoint).map(([x, y]) => ({ x, y, theta: 0 })),
          stations: newPath.stations?.map(({ position: [x, y, z], id }) => ({ x, y, z, id })) ?? [],
        });
        get().showToast('Path saved successfully!');
      } catch (e) {
        set({ error: 'Failed to save path' });
        get().showToast('Failed to save path');
      }
    },
    cancelNamedPath: () =>
      set({
        showNameModal: false,
        pendingPath: null,
        pendingDefaultName: '',
        stationsOnPath: [],
        startingStation: null,
        selectedStation: null,
      }),

    // Mission
    selectedPathId: null,
    selectedStation: null,
    isMissionRunning: false,
    missionPath: null,
    missionTargetIdx: 0,
    setSelectedPathId: (id) => set({ selectedPathId: id }),
    setSelectedStation: (station) => set({ selectedStation: station }),
    startMission: () => {
      const { paths, selectedPathId, selectedStation, socket, showToast } = get();
      if (!selectedPathId) {
        showToast('Please select a path!');
        return;
      }
      if (!selectedStation) {
        showToast('Select a station!');
        return;
      }
      const path = paths.find((p) => p.id === selectedPathId);
      if (!path || !socket) {
        showToast('Invalid path or no connection!');
        return;
      }

      // Find the selected station
      const station = path.stations?.find((s) => s.id === selectedStation);
      if (!station) {
        showToast('Invalid station selected!');
        return;
      }

      // Debug: Log mission start details
      console.log(`Starting mission from station: ${selectedStation}, Path ID: ${selectedPathId}`);

      // Teleport turtle to the selected station
      socket.emit('teleportTurtle', { x: station.position[0], y: station.position[1], theta: 0 });
      set({
        turtlePose: { x: station.position[0], y: station.position[1], theta: 0 },
        turtlePosition: [station.position[0], station.position[1], 0],
        turtleRotation: 0,
      });

      // Determine path direction based on station
      let points = path.points.map(clampTurtlePoint).map(([x, y]) => [x, y] as [number, number]);
      // Check if the selected station is the end station
      const isEndStation = path.stations && path.stations[path.stations.length - 1]?.id === selectedStation;
      if (isEndStation) {
        points = [...points].reverse();
      }

      // Start mission
      set({
        isMissionRunning: true,
        missionPath: points,
        missionTargetIdx: 0,
      });
      socket.emit('startMission', { points });
      showToast('Mission started!');
    },
    stopMission: () => {
      const { socket } = get();
      if (socket) {
        socket.emit('stopMission');
      }
      set({
        isMissionRunning: false,
        missionPath: null,
        missionTargetIdx: 0,
      });
      get().showToast('Mission stopped!');
    },

    // Socket and connection
    socket: null,
    connected: false,
    error: null,
    loading: true,
    initializeSocket: () => {
      const socketInstance = io('http://localhost:5000', { transports: ['websocket'] });
      socketInstance.on('connect', () => {
        set({
          connected: true,
          error: null,
          loading: false,
          turtlePose: { x: 0, y: 0, theta: 0 },
          turtlePosition: [0, 0, 0],
          turtleRotation: 0,
        });
        get().showToast('Connected to ROS!');
      });
      socketInstance.on('disconnect', () => {
        set({ connected: false });
        get().showToast('Disconnected from ROS');
      });
      socketInstance.on('turtlePose', (pose: TurtlePose) => {
        get().setTurtlePose(pose);
      });
      socketInstance.on('error', (error) => {
        set({ error: error.message });
        get().showToast(error.message);
      });
      socketInstance.on('missionComplete', () => {
        set({ isMissionRunning: false, missionPath: null, missionTargetIdx: 0 });
        get().showToast('Mission complete!');
      });
      socketInstance.on('missionStopped', () => {
        set({ isMissionRunning: false, missionPath: null, missionTargetIdx: 0 });
        get().showToast('Mission stopped!');
      });
      set({ socket: socketInstance });

      // Fetch paths on connect
      const fetchPaths = async () => {
        try {
          const res0 = await axios.get('http://localhost:5000/path/paths');
          set({
            paths: res0.data.map((p: any) => ({
              id: p._id,
              name: p.name,
              points: p.points.map((pt: any) => [pt.x, pt.y, pt.theta ?? 0] as [number, number, number]),
              stations: p.stations?.map((st: any) => ({
                position: [st.x, st.y, st.z ?? 0] as [number, number, number],
                id: st.id ?? `station-${st.x}-${st.y}`,
              })) ?? [],
            })),
          });
        } catch (e) {
          set({ error: 'Failed to fetch saved paths' });
          get().showToast('Failed to fetch saved paths');
        }
      };
      fetchPaths();
    },
    publishVelocity: (linear, angular) => {
      const { socket, connected } = get();
      if (socket && connected) {
        socket.emit('turtleControl', { linear, angular });
      }
    },

    // UI
    toast: null,
    showNameModal: false,
    showToast: (msg) => {
      if (toastTimeout) {
        clearTimeout(toastTimeout);
      }
      set({ toast: msg });
      toastTimeout = setTimeout(() => {
        set({ toast: null });
        toastTimeout = null;
      }, 3000);
    },
    setShowNameModal: (show) => set({ showNameModal: show }),
  };
});