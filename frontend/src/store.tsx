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
  stations?: [number, number, number][];
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
  stationsOnPath: [number, number, number][];
  pendingPath: [number, number, number][] | null;
  pendingDefaultName: string;
  setPaths: (paths: Path[]) => void;
  startMapping: () => void;
  stopMapping: () => void;
  addStationOnPath: () => void;
  saveNamedPath: (name: string) => Promise<void>;
  cancelNamedPath: () => void;

  // Mission
  selectedPathId: string | null;
  selectedStation: 'start' | 'end' | null;
  isMissionRunning: boolean;
  missionPath: [number, number][] | null;
  missionTargetIdx: number;
  setSelectedPathId: (id: string | null) => void;
  setSelectedStation: (station: 'start' | 'end' | null) => void;
  startMission: () => void;

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
      set((state) => ({
        ...state,
        turtlePose: pose,
        turtlePosition: [pose.x, pose.y, 0] as [number, number, number],
        turtleRotation: pose.theta,
        ...(state.isMapping && {
          currentPath: [...state.currentPath, [pose.x, pose.y, 0]],
        }),
      })),

    // Paths and mapping
    paths: [],
    currentPath: [],
    isMapping: false,
    stationsOnPath: [],
    pendingPath: null,
    pendingDefaultName: '',
    setPaths: (paths) => set({ paths }),
    startMapping: () =>
      set((state) => ({
        isMapping: true,
        currentPath: [[state.turtlePose.x, state.turtlePose.y, 0]],
        stationsOnPath: [[state.turtlePose.x, state.turtlePose.y, 0]], // Start station
      })),
    stopMapping: () => {
      const { currentPath, paths, stationsOnPath, turtlePose } = get();
      if (currentPath.length > 1) {
        const filteredPath = filterPathPoints(currentPath);
        const finalStations: [number, number, number][] = [
          ...stationsOnPath,
          [turtlePose.x, turtlePose.y, 0] as [number, number, number], // End station
        ];
        set({
          isMapping: false,
          pendingPath: filteredPath,
          pendingDefaultName: `Path ${paths.length + 1}`,
          showNameModal: true,
          currentPath: [],
          stationsOnPath: finalStations,
        });
      } else {
        set({
          isMapping: false,
          currentPath: [],
          stationsOnPath: [],
          showNameModal: false,
        });
      }
    },
    addStationOnPath: () =>
      set((state) => ({
        stationsOnPath: [...state.stationsOnPath, [state.turtlePose.x, state.turtlePose.y, 0] as [number, number, number]],
      })),
    saveNamedPath: async (name) => {
      const { pendingPath, stationsOnPath, paths } = get();
      if (!pendingPath) return;
      const newPath: Path = {
        points: pendingPath,
        id: Date.now().toString(),
        name,
        stations: stationsOnPath, // Includes start, intermediates, and end
      };
      set({
        paths: [...paths, newPath],
        showNameModal: false,
        pendingPath: null,
        pendingDefaultName: '',
        stationsOnPath: [],
      });
      try {
        await axios.post('http://localhost:5000/path/savePath', {
          name: newPath.name,
          points: newPath.points.map(clampTurtlePoint).map(([x, y]) => ({ x, y, theta: 0 })),
          stations: newPath.stations?.map(([x, y, z]) => ({ x, y, z })) ?? [],
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
      }),

    // Mission
    selectedPathId: null,
    selectedStation: null,
    isMissionRunning: false,
    missionPath: null,
    missionTargetIdx: 0,
    setSelectedPathId: (id) => set({ selectedPathId: id, selectedStation: null }),
    setSelectedStation: (station) => set({ selectedStation: station }),
    startMission: () => {
      const { paths, selectedPathId, selectedStation, socket } = get();
      const path = paths.find((p) => p.id === selectedPathId);
      if (!path || !socket) return;
      set({ isMissionRunning: true, missionTargetIdx: 0 });
      let points = path.points.map(clampTurtlePoint).map(([x, y]) => [x, y] as [number, number]);
      if (selectedStation === 'end') {
        points = [...points].reverse();
      }
      set({ missionPath: points });
      socket.emit('startMission', { points });
      get().showToast('Mission started!');
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
              stations: p.stations?.map((st: any) => [st.x, st.y, st.z ?? 0] as [number, number, number]) ?? [],
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
      // Clear any existing toast timer
      if (toastTimeout) {
        clearTimeout(toastTimeout);
      }
      // Set new toast message
      set({ toast: msg });
      // Set timer to clear toast after 3 seconds
      toastTimeout = setTimeout(() => {
        set({ toast: null });
        toastTimeout = null;
      }, 3000);
    },
    setShowNameModal: (show) => set({ showNameModal: show }),
  };
});