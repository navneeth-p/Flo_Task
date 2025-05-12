import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, ThreeEvent } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import io from 'socket.io-client';
import axios from 'axios';

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

interface SceneProps {
  turtlePose: { x: number; y: number; theta: number };
}

// Neon grid component (improved glow/contrast)
const NeonGrid = ({ size = 20, divisions = 40, color = "#00bfff" }) => {
  const lines: [
    [number, number, number],
    [number, number, number]
  ][] = [];
  for (let i = 0; i <= divisions; i++) {
    const p = (i / divisions) * size - size / 2;
    lines.push([
      [p, -size / 2, 0],
      [p, size / 2, 0],
    ]);
    lines.push([
      [-size / 2, p, 0],
      [size / 2, p, 0],
    ]);
  }
  return (
    <>
      {lines.map((pts, idx) => (
        <Line key={idx} points={pts} color={color} lineWidth={2} opacity={0.7} />
      ))}
    </>
  );
};

const Turtle = ({ position, rotation }: { position: [number, number, number], rotation: number }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.set(...position);
      meshRef.current.rotation.set(-Math.PI / 2, 0, rotation);
    }
  });
  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[0.7, 0.7, 0.1]} />
      <meshStandardMaterial color="#00ff99" />
    </mesh>
  );
};

// Improved StationMarker with glow, ring, and type
const StationMarker = ({ position, type, isSelected, isHovered, onClick, onPointerOver, onPointerOut }: {
  position: [number, number, number],
  type?: 'start' | 'end' | 'station',
  isSelected: boolean,
  isHovered: boolean,
  onClick: () => void,
  onPointerOver?: () => void,
  onPointerOut?: () => void
}) => {
  let color = '#ff69f6';
  let emissive = '#ff69f6';
  let ringColor = '#fff';
  let scale = 0.8;
  if (type === 'start') {
    color = '#4ade80'; // green
    emissive = '#4ade80';
    ringColor = '#4ade80';
    scale = 1.2;
  } else if (type === 'end') {
    color = '#facc15'; // yellow
    emissive = '#facc15';
    ringColor = '#facc15';
    scale = 1.2;
  } else if (isSelected) {
    scale = 1.1;
    color = '#fff';
    emissive = '#fff';
    ringColor = '#fff';
  } else if (isHovered) {
    scale = 1;
  }
  return (
    <group position={position}>
      {/* Glowing sphere */}
      <mesh
        scale={scale}
        onClick={onClick}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
      >
        <sphereGeometry args={[0.35, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={1.2}
          opacity={1}
          transparent={false}
        />
      </mesh>
      {/* Ring/border */}
      <mesh scale={scale * 1.25}>
        <torusGeometry args={[0.35, 0.06, 16, 64]} />
        <meshBasicMaterial color={ringColor} transparent opacity={0.5} />
      </mesh>
    </group>
  );
};

const PathLine = ({ points, color = "#ff69f6" }: { points: [number, number, number][]; color?: string }) => (
  <Line points={points} color={color} lineWidth={6} position={[0, 0, 0.05]} />
);

const clampTurtlePoint = ([x, y, z]: [number, number, number]): [number, number, number] => [
  Math.max(-10, Math.min(10, x)),
  Math.max(-10, Math.min(10, y)),
  z
];

// Filter path points to remove points that are too close together
function filterPathPoints(points: [number, number, number][], minDist = 0.2) {
  if (points.length === 0) return [];
  const filtered = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const [x1, y1] = filtered[filtered.length - 1];
    const [x2, y2] = points[i];
    if (Math.hypot(x2 - x1, y2 - y1) >= minDist) {
      filtered.push(points[i]);
    }
  }
  return filtered;
}

// Toast component
const Toast: React.FC<{ message: string }> = ({ message }) => (
  <div style={{
    position: 'fixed',
    bottom: 40,
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(30,30,30,0.95)',
    color: '#fff',
    padding: '16px 32px',
    borderRadius: 12,
    fontSize: 18,
    fontWeight: 600,
    zIndex: 9999,
    boxShadow: '0 4px 32px #000a',
    pointerEvents: 'none',
    transition: 'opacity 0.3s'
  }}>
    {message}
  </div>
);

// Modal for naming the path
const NamePathModal: React.FC<{
  open: boolean;
  defaultName: string;
  onSave: (name: string) => void;
  onCancel: () => void;
}> = ({ open, defaultName, onSave, onCancel }) => {
  const [name, setName] = useState(defaultName);
  useEffect(() => { setName(defaultName); }, [defaultName, open]);
  if (!open) return null;
  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, width: '100vw', height: '100vh',
      background: 'rgba(0,0,0,0.55)',
      zIndex: 10000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'hsl(240, 6%, 10%)',
        borderRadius: 16,
        padding: '32px 32px 24px 32px',
        minWidth: 340,
        boxShadow: '0 8px 40px #000b',
        border: '1.5px solid hsl(240, 4%, 16%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 18, color: '#fff' }}>Name your path</div>
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          style={{
            width: 220,
            borderRadius: 7,
            border: '1.5px solid hsl(240, 4%, 16%)',
            background: 'hsl(240, 6%, 14%)',
            color: '#fff',
            padding: '8px 12px',
            fontWeight: 500,
            fontSize: 16,
            marginBottom: 18,
            outline: 'none',
          }}
          placeholder="Path name"
        />
        <div style={{ display: 'flex', gap: 16 }}>
          <button
            onClick={() => onSave(name.trim() || defaultName)}
            style={{
              background: 'hsl(240, 5%, 18%)', color: '#fff', border: 'none', borderRadius: 8,
              padding: '7px 28px', fontWeight: 600, fontSize: 16, boxShadow: '0 1px 4px #0003', cursor: 'pointer',
            }}
          >Save</button>
          <button
            onClick={onCancel}
            style={{
              background: 'hsl(0, 80%, 40%)', color: '#fff', border: 'none', borderRadius: 8,
              padding: '7px 28px', fontWeight: 600, fontSize: 16, boxShadow: '0 1px 4px #0003', cursor: 'pointer',
            }}
          >Cancel</button>
        </div>
      </div>
    </div>
  );
};

const Scene: React.FC<SceneProps> = ({ turtlePose }) => {
  const [paths, setPaths] = useState<Path[]>([]);
  const [isMapping, setIsMapping] = useState(false);
  const [currentPath, setCurrentPath] = useState<[number, number, number][]>([]);
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);
  const [turtlePosition, setTurtlePosition] = useState<[number, number, number]>([0, 0, 0]);
  const [turtleRotation, setTurtleRotation] = useState(0);
  const [isMissionRunning, setIsMissionRunning] = useState(false);
  const [socket, setSocket] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pathName, setPathName] = useState('');
  const [selectedStation, setSelectedStation] = useState<'start' | 'end' | null>(null);
  const [hoveredStation, setHoveredStation] = useState<'start' | 'end' | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [missionPath, setMissionPath] = useState<[number, number][] | null>(null);
  const [missionTargetIdx, setMissionTargetIdx] = useState<number>(0);
  const [showNameModal, setShowNameModal] = useState(false);
  const [pendingPath, setPendingPath] = useState<[number, number, number][] | null>(null);
  const [pendingDefaultName, setPendingDefaultName] = useState('');
  const [stationsOnPath, setStationsOnPath] = useState<[number, number, number][]>([]);

  useEffect(() => {
    setTurtlePosition([turtlePose.x, turtlePose.y, 0]);
    setTurtleRotation(turtlePose.theta);
  }, [turtlePose]);

  useEffect(() => {
    const socketInstance = io('http://localhost:5000');
    setSocket(socketInstance);
    socketInstance.on('connect', () => setLoading(false));
    socketInstance.on('turtlePose', (pose) => {
      setTurtlePosition([pose.x, pose.y, 0]);
      setTurtleRotation(pose.theta);
    });
    socketInstance.on('error', (error) => setError(error.message));
    socketInstance.on('missionComplete', () => {
      setIsMissionRunning(false);
      showToast('Mission complete!');
    });
    socketInstance.on('missionStopped', () => {
      showToast('Mission stopped!');
    });
    return () => { socketInstance.disconnect(); };
  }, []);

  useEffect(() => {
    if (!isMapping) return;
    setCurrentPath(prev => {
      const last: [number, number, number] | undefined = prev[prev.length - 1];
      const curr: [number, number, number] = [turtlePose.x, turtlePose.y, 0];
      if (!last || Math.hypot(last[0] - curr[0], last[1] - curr[1]) > 0.1) {
        return [...prev, curr] as [number, number, number][];
      }
      return prev;
    });
  }, [turtlePose, isMapping]);

  // Track mission path and next target for rotation
  useEffect(() => {
    if (!isMissionRunning) {
      setMissionPath(null);
      setMissionTargetIdx(0);
      return;
    }
    // Find the current mission path (from selected path and direction)
    const path = paths.find(p => p.id === selectedPathId);
    if (!path) return;
    let points = path.points.map(clampTurtlePoint).map(([x, y, z]) => [x, y] as [number, number]);
    if (selectedStation === 'end') {
      points = [...points].reverse();
    }
    setMissionPath(points);
    setMissionTargetIdx(0);
  }, [isMissionRunning, selectedPathId, selectedStation, paths]);

  // Update mission target index as turtle moves
  useEffect(() => {
    if (!isMissionRunning || !missionPath) return;
    // Find the closest point ahead of the turtle
    let idx = missionTargetIdx;
    while (
      idx < missionPath.length &&
      Math.hypot(turtlePosition[0] - missionPath[idx][0], turtlePosition[1] - missionPath[idx][1]) < 0.15
    ) {
      idx++;
    }
    setMissionTargetIdx(idx);
  }, [turtlePosition, isMissionRunning, missionPath, missionTargetIdx]);

  // Compute turtle rotation: if on mission, face next point; else use theta
  let turtleRotationDisplay = turtleRotation;
  if (isMissionRunning && missionPath && missionTargetIdx < missionPath.length) {
    const [tx, ty] = turtlePosition;
    const [nx, ny] = missionPath[missionTargetIdx] || [tx, ty];
    turtleRotationDisplay = Math.atan2(ny - ty, nx - tx);
  }

  // Helper to show toast for 2.5s
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    // Fetch all saved paths from backend on mount
    const fetchPaths = async () => {
      try {
        const res = await axios.get('http://localhost:5000/path/paths');
        setPaths(res.data.map((p: any) => ({
          id: p._id,
          name: p.name,
          points: p.points.map((pt: any) => [pt.x, pt.y, pt.theta ?? 0]),
        })));
      } catch (e) {
        setError('Failed to fetch saved paths');
        showToast('Failed to fetch saved paths');
      }
    };
    fetchPaths();
  }, []);

  const startMapping = () => {
    setIsMapping(true);
    setCurrentPath([[turtlePose.x, turtlePose.y, 0]]);
  };

  const stopMapping = () => {
    setIsMapping(false);
    if (currentPath.length > 1) {
      const filteredPath = filterPathPoints(currentPath);
      setPendingPath(filteredPath);
      setPendingDefaultName(pathName || `Path ${paths.length + 1}`);
      setShowNameModal(true);
      setCurrentPath([]);
      setPathName('');
      setStationsOnPath([]);
    }
  };

  // Add station during mapping
  const handleAddStationOnPath = () => {
    setStationsOnPath(prev => [...prev, [turtlePose.x, turtlePose.y, 0]]);
  };

  // Save path from modal
  const handleSaveNamedPath = async (name: string) => {
    if (!pendingPath) return;
    const newPath: Path = {
      points: pendingPath,
      id: Date.now().toString(),
      name,
      stations: stationsOnPath,
    } as any;
    setPaths(prev => [...prev, newPath]);
    setShowNameModal(false);
    setPendingPath(null);
    setPendingDefaultName('');
    setStationsOnPath([]);
    // Save to backend
    try {
      await axios.post('http://localhost:5000/path/savePath', {
        name: newPath.name,
        points: newPath.points.map(clampTurtlePoint).map(([x, y, z]) => ({ x, y, theta: 0 })),
        stations: newPath.stations,
      });
    } catch (e) {
      setError('Failed to save path');
    }
  };

  // Cancel modal
  const handleCancelNamedPath = () => {
    setShowNameModal(false);
    setPendingPath(null);
    setPendingDefaultName('');
  };

  const startMission = () => {
    const path = paths.find(p => p.id === selectedPathId);
    if (!path || !socket) return;
    setIsMissionRunning(true);
    let points = path.points.map(clampTurtlePoint).map(([x, y, z]) => [x, y] as [number, number]);
    if (selectedStation === 'end') {
      points = [...points].reverse();
    }
    socket.emit('startMission', { points });
    showToast('Mission started!');
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!socket) return;
      switch (event.key) {
        case 'ArrowUp':
          socket.emit('turtleControl', { linear: 1, angular: 0 });
          break;
        case 'ArrowDown':
          socket.emit('turtleControl', { linear: -1, angular: 0 });
          break;
        case 'ArrowLeft':
          socket.emit('turtleControl', { linear: 0, angular: 1 });
          break;
        case 'ArrowRight':
          socket.emit('turtleControl', { linear: 0, angular: -1 });
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [socket]);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: '#181a20' }}>
      <Canvas
        camera={{ position: [0, 0, 20], up: [0, 1, 0], fov: 50 }}
        style={{ width: '100vw', height: '100vh', background: '#181a20' }}
      >
        <ambientLight intensity={1.0} />
        <pointLight position={[0, 0, 20]} intensity={1.5} color="#00bfff" />
        {/* Neon grid */}
        <NeonGrid size={20} divisions={40} color="#00bfff" />
        {/* Plane for click events (no longer used for stations) */}
        <mesh
          position={[0, 0, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[20, 20]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
        {/* Path */}
        {/* {paths.map(path => (
           path.id === selectedPathId && (
          <PathLine key={path.id} points={path.points} color={path.id === selectedPathId ? "#fff700" : "#ff69f6"} />
           )
        ))} */}
        {paths.map((path) =>
          path.id === selectedPathId ? (
            <PathLine key={path.id} points={path.points} color="#00ffcc" />
          ) : null
        )}

        {isMapping && currentPath.length > 1 && (
          <PathLine points={currentPath} color="#00ffea" />
        )}
        {/* Start/End stations for selected path, clickable */}
        {(() => {
          const path = paths.find(p => p.id === selectedPathId);
          if (path && path.points.length > 1) {
            return <>
              <StationMarker
                position={path.points[0]}
                type="start"
                isSelected={selectedStation === 'start'}
                isHovered={hoveredStation === 'start'}
                onClick={() => setSelectedStation('start')}
                onPointerOver={() => setHoveredStation('start')}
                onPointerOut={() => setHoveredStation(null)}
              />
              <StationMarker
                position={path.points[path.points.length - 1]}
                type="end"
                isSelected={selectedStation === 'end'}
                isHovered={hoveredStation === 'end'}
                onClick={() => setSelectedStation('end')}
                onPointerOver={() => setHoveredStation('end')}
                onPointerOut={() => setHoveredStation(null)}
              />
            </>;
          }
          return null;
        })()}
        {/* Turtle */}
        <Turtle position={turtlePosition} rotation={turtleRotationDisplay} />
        {/* Show stations added during mapping */}
        {isMapping && stationsOnPath.map((pos, i) => (
          <StationMarker
            key={`mapping-station-${i}`}
            position={pos}
            type="station"
            isSelected={false}
            isHovered={false}
            onClick={() => {}}
          />
        ))}
        {/* Show all stations for selected path after saving */}
        {(() => {
          const path = paths.find(p => p.id === selectedPathId);
          if (path?.stations && path.stations.length > 0) {
            return path.stations.map((pos, i) => {
              let type: 'start' | 'end' | 'station' = 'station';
              if (i === 0) type = 'start';
              else if (i === path.stations!.length - 1) type = 'end';
              const isSelected = (type === 'start' && selectedStation === 'start') || 
                               (type === 'end' && selectedStation === 'end');
              return (
                <StationMarker
                  key={`saved-station-${i}`}
                  position={pos}
                  type={type}
                  isSelected={isSelected}
                  isHovered={false}
                  onClick={() => type !== 'station' && setSelectedStation(type)}
                />
              );
            });
          }
          return null;
        })()}
      </Canvas>
      {/* Floating UI panel - shadcn-inspired dark style */}
      <div style={{
        position: 'absolute',
        top: 24,
        left: 24,
        background: 'hsl(240, 6%, 10%)',
        color: 'hsl(0,0%,98%)',
        padding: '28px 22px',
        borderRadius: '18px',
        minWidth: '240px',
        zIndex: 10,
        fontFamily: 'Inter, sans-serif',
        boxShadow: '0 6px 32px #000b',
        fontSize: 16,
        border: '1.5px solid hsl(240, 4%, 16%)',
        transition: 'box-shadow 0.2s',
      }}>
        <div style={{ marginBottom: 20, fontWeight: 700, fontSize: 20, letterSpacing: 0.5 }}>Select a path</div>
        {/* Mapping controls: Start/Stop and Add Station */}
        <div style={{ marginBottom: 18, display: 'flex', alignItems: 'center' }}>
          <span style={{ fontWeight: 500 }}>Mapping</span>
          <button onClick={startMapping} disabled={isMapping} style={{ marginLeft: 14, background: 'hsl(240, 5%, 18%)', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 20px', fontWeight: 600, opacity: isMapping ? 0.5 : 1, boxShadow: '0 1px 4px #0003', transition: 'background 0.2s', fontSize: 15 }}>Start</button>
          <button onClick={stopMapping} disabled={!isMapping} style={{ marginLeft: 10, background: 'hsl(0, 80%, 40%)', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 20px', fontWeight: 600, opacity: !isMapping ? 0.5 : 1, boxShadow: '0 1px 4px #0003', transition: 'background 0.2s', fontSize: 15 }}>Stop</button>
          {isMapping && (
            <button onClick={handleAddStationOnPath} style={{ marginLeft: 10, background: 'hsl(240, 80%, 60%)', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 20px', fontWeight: 600, boxShadow: '0 1px 4px #0003', transition: 'background 0.2s', fontSize: 15 }}>Add Station</button>
          )}
        </div>
        <div style={{ marginBottom: 18, display: 'flex', alignItems: 'center' }}>
          <span style={{ fontWeight: 500 }}>Mission</span>
          <button onClick={startMission} disabled={!selectedPathId || isMissionRunning || !selectedStation} style={{ marginLeft: 14, background: 'hsl(240, 5%, 18%)', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 20px', fontWeight: 600, opacity: (!selectedPathId || isMissionRunning || !selectedStation) ? 0.5 : 1, boxShadow: '0 1px 4px #0003', transition: 'background 0.2s', fontSize: 15 }}>Start</button>
        </div>
        {/* <div style={{ marginBottom: 12 }}>
          <div style={{ marginBottom: 5, fontWeight: 500 }}>Paths:</div>
          <ul style={{ maxHeight: 120, overflowY: 'auto', padding: 0, margin: 0 }}>
            {paths.map(path => (
              <li
                key={path.id}
                style={{
                  listStyle: 'none',
                  background: path.id === selectedPathId ? 'hsl(240, 5%, 18%)' : 'transparent',
                  padding: '6px 12px',
                  borderRadius: 5,
                  cursor: 'pointer',
                  marginBottom: 2,
                  fontWeight: 500,
                  color: path.id === selectedPathId ? '#fff' : '#bbb',
                  border: path.id === selectedPathId ? '1.5px solid hsl(240, 4%, 16%)' : 'none',
                  transition: 'background 0.2s, color 0.2s',
                  fontSize: 15,
                }}
                onClick={() => { setSelectedPathId(path.id); setSelectedStation(null); }}
              >
                {path.name}
              </li>
            ))}
          </ul>
        </div> */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ color: '#fff', fontWeight: 'bold', marginRight: 8 }}>Select Path:</label>
          <select
            title="Select a path"
            value={selectedPathId ?? ''}
            onChange={(e) => {
              const value = e.target.value;
              setSelectedPathId(value === '' ? null : value);
            }}
            style={{
              padding: '8px 12px',
              borderRadius: 6,
              backgroundColor: '#1a1a1a',
              color: '#fff',
              border: '1px solid #444',
              fontSize: 16,
            }}
          >
            <option value="">-- None --</option>
            {paths.map((path) => (
              <option key={path.id} value={path.id}>
                {path.name}
              </option>
            ))}
          </select>
        </div>

        {error && <div style={{ color: '#ff69f6', marginTop: '10px', fontWeight: 500 }}>{error}</div>}
        {loading && <div style={{ marginTop: '10px' }}>Loading...</div>}
      </div>
      {toast && <Toast message={toast} />}
      <NamePathModal
        open={showNameModal}
        defaultName={pendingDefaultName}
        onSave={handleSaveNamedPath}
        onCancel={handleCancelNamedPath}
      />
    </div>
  );
};

export default Scene; 