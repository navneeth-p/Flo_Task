import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Line, Tube } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../store';

interface SceneProps {}

// Neon grid component
const NeonGrid = ({ size = 20, divisions = 40, color = '#00bfff' }) => {
  const lines: [[number, number, number], [number, number, number]][] = [];
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

// Turtle component (box)
const Turtle = ({ position, rotation }: { position: [number, number, number]; rotation: number }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const prevRotation = useRef(rotation);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.set(...position);
      // Smoothly interpolate rotation
      const targetRotation = rotation;
      const currentRotation = prevRotation.current;
      const delta = (targetRotation - currentRotation) % (2 * Math.PI);
      const adjustedDelta = delta > Math.PI ? delta - 2 * Math.PI : delta < -Math.PI ? delta + 2 * Math.PI : delta;
      const newRotation = currentRotation + adjustedDelta * 0.1; // Adjust speed with 0.1
      meshRef.current.rotation.set(-Math.PI / 2, 0, newRotation);
      prevRotation.current = newRotation;
    }
  });

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[0.5, 0.5, 0.5]} />
      <meshStandardMaterial color="#00ff99" />
    </mesh>
  );
};

// Station marker component with hover animation
const StationMarker = ({
  position,
  type,
  id,
  isSelected,
  isHovered,
  onClick,
  onPointerOver,
  onPointerOut,
}: {
  position: [number, number, number];
  type: 'start' | 'end' | 'station';
  id: string;
  isSelected: boolean;
  isHovered: boolean;
  onClick: () => void;
  onPointerOver?: () => void;
  onPointerOut?: () => void;
}) => {
  // Debug: Log when rendering with selection state
  useEffect(() => {
    console.log(`StationMarker ${id}: isSelected=${isSelected}, isHovered=${isHovered}`);
  }, [id, isSelected, isHovered]);

  const scale = type === 'start' || type === 'end' ? 1.1 : isSelected ? 1.05 : isHovered ? 1 : 0.7;
  // Prioritize isSelected for color
  const color = isSelected ? '#00f' : type === 'start' ? '#4ade80' : type === 'end' ? '#facc15' : '#ff69f6';
  const emissive = color;
  const ringColor = type === 'start' || type === 'end' ? color : '#fff';

  return (
    <group position={position}>
      <mesh
        scale={scale}
        onClick={() => {
          console.log(`Clicked station: ${id}`);
          onClick();
        }}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
      >
        <sphereGeometry args={[0.25, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={1.2}
          opacity={1}
          transparent={false}
        />
      </mesh>
      <mesh scale={scale * 1.25}>
        <torusGeometry args={[0.25, 0.04, 16, 64]} />
        <meshBasicMaterial color={ringColor} transparent opacity={0.5} />
      </mesh>
    </group>
  );
};

// Path tube component
const PathTube = ({ points, color = '#ff69f6' }: { points: [number, number, number][]; color?: string }) => {
  const curve = useMemo(() => {
    // Filter out invalid points (NaN, undefined) and ensure at least 2 points
    const validPoints = points.filter(([x, y, z]) => !isNaN(x) && !isNaN(y) && !isNaN(z));
    if (validPoints.length < 2) return null;
    const vectors = validPoints.map(([x, y, z]) => new THREE.Vector3(x, y, z));
    return new THREE.CatmullRomCurve3(vectors);
  }, [points]);

  if (!curve) return null;

  return (
    <Tube args={[curve, 64, 0.1, 8, false]} position={[0, 0, 0.05]}>
      <meshStandardMaterial color={color} />
    </Tube>
  );
};

// Toast component with fade animation
const Toast: React.FC<{ message: string }> = ({ message }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    return () => setIsVisible(false);
  }, [message]);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '5vh',
        left: '50%',
        transform: isVisible ? 'translateX(-50%)' : 'translateX(-50%) translateY(20px)',
        background: 'rgba(30,30,30,0.95)',
        color: '#fff',
        padding: '1rem 2rem',
        borderRadius: '12px',
        fontSize: '1.125rem',
        fontWeight: 600,
        zIndex: 9999,
        boxShadow: '0 4px 32px #00bfff55',
        pointerEvents: 'none',
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 0.3s ease-in-out, transform 0.3s ease-in-out',
      }}
    >
      {message}
    </div>
  );
};

// Modal for naming the path with smooth transition
const NamePathModal: React.FC<{
  open: boolean;
  defaultName: string;
  onSave: (name: string) => void;
  onCancel: () => void;
}> = ({ open, defaultName, onSave, onCancel }) => {
  const [name, setName] = useState(defaultName);
  useEffect(() => {
    setName(defaultName);
  }, [defaultName, open]);

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0,0,0,0.55)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'opacity 0.3s ease-in-out',
        opacity: open ? 1 : 0,
      }}
    >
      <div
        style={{
          background: 'hsl(240, 6%, 10%)',
          borderRadius: '16px',
          padding: '2rem 1.5rem',
          width: 'min(90vw, 340px)',
          boxShadow: '0 8px 40px #000b',
          border: '1.5px solid hsl(240, 4%, 16%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          transform: open ? 'scale(1)' : 'scale(0.95)',
          transition: 'transform 0.3s ease-in-out',
        }}
      >
        <div style={{ fontWeight: 700, fontSize: '1.25rem', marginBottom: '1rem', color: '#fff' }}>
          Name your path
        </div>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{
            width: '100%',
            borderRadius: '7px',
            border: '1.5px solid hsl(240, 4%, 16%)',
            background: 'hsl(240, 6%, 14%)',
            color: '#fff',
            padding: '0.5rem 0.75rem',
            fontWeight: 500,
            fontSize: '1rem',
            marginBottom: '1rem',
            outline: 'none',
            transition: 'border-color 0.2s',
          }}
          placeholder="Path name"
          onFocus={(e) => (e.target.style.borderColor = '#00bfff')}
          onBlur={(e) => (e.target.style.borderColor = 'hsl(240, 4%, 16%)')}
        />
        <div style={{ display: 'flex', gap: '1rem', width: '100%', justifyContent: 'center' }}>
          <button
            onClick={() => onSave(name.trim() || defaultName)}
            style={{
              background: 'hsl(240, 5%, 18%)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '0.5rem 1.5rem',
              fontWeight: 600,
              fontSize: '1rem',
              boxShadow: '0 1px 4px #0003',
              cursor: 'pointer',
              transition: 'background 0.2s, transform 0.1s',
              flex: 1,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'hsl(240, 5%, 24%)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'hsl(240, 5%, 18%)')}
          >
            Save
          </button>
          <button
            onClick={onCancel}
            style={{
              background: 'hsl(0, 80%, 40%)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '0.5rem 1.5rem',
              fontWeight: 600,
              fontSize: '1rem',
              boxShadow: '0 1px 4px #0003',
              cursor: 'pointer',
              transition: 'background 0.2s, transform 0.1s',
              flex: 1,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'hsl(0, 80%, 50%)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'hsl(0, 80%, 40%)')}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// Scene component
const Scene: React.FC<SceneProps> = () => {
  const {
    turtlePosition,
    turtleRotation,
    paths,
    currentPath,
    isMapping,
    startingStation,
    stationsOnPath,
    selectedPathId,
    selectedStation,
    isMissionRunning,
    missionPath,
    missionTargetIdx,
    toast,
    showNameModal,
    pendingDefaultName,
    setStartingStation,
    startMapping,
    stopMapping,
    saveNamedPath,
    cancelNamedPath,
    setSelectedPathId,
    setSelectedStation,
    startMission,
    stopMission,
    error,
    loading,
  } = useStore();
  const [hoveredStation, setHoveredStation] = useState<string | null>(null);

  // Debug: Log selectedStation changes
  useEffect(() => {
    console.log('Selected station updated:', selectedStation);
  }, [selectedStation]);

  // Update mission target index
  useEffect(() => {
    if (!isMissionRunning || !missionPath) return;
    let idx = missionTargetIdx;
    while (
      idx < missionPath.length &&
      Math.hypot(turtlePosition[0] - missionPath[idx][0], turtlePosition[1] - missionPath[idx][1]) < 0.15
    ) {
      idx++;
    }
    useStore.setState({ missionTargetIdx: idx });
  }, [turtlePosition, isMissionRunning, missionPath, missionTargetIdx]);

  // Compute turtle rotation for mission
  let turtleRotationDisplay = turtleRotation;
  if (isMissionRunning && missionPath && missionTargetIdx < missionPath.length) {
    const [tx, ty] = turtlePosition;
    const [nx, ny] = missionPath[missionTargetIdx] || [tx, ty];
    turtleRotationDisplay = Math.atan2(ny - ty, nx - tx);
  }

  // Memoize station markers for selected path
  const selectedPathStations = useMemo(() => {
    const path = paths.find((p) => p.id === selectedPathId);
    if (!path || !path.stations) return [];

    return path.stations.map(({ position, id }, i) => {
      if (i !== 0 && i !== path.stations!.length - 1) return null; // Skip intermediate stations for rendering
      const type: 'start' | 'end' = i === 0 ? 'start' : 'end';
      const isSelected = selectedStation === id;
      const isClickable = true;
      return (
        <StationMarker
          key={`saved-station-${id}`}
          position={position}
          type={type}
          id={id}
          isSelected={isSelected}
          isHovered={isClickable && hoveredStation === id}
          onClick={() => {
            console.log(`Selecting saved station: ${id}`);
            setSelectedStation(id);
          }}
          onPointerOver={() => isClickable && setHoveredStation(id)}
          onPointerOut={() => isClickable && setHoveredStation(null)}
        />
      );
    }).filter(Boolean);
  }, [paths, selectedPathId, selectedStation, hoveredStation, setSelectedStation]);

  // Station markers during mapping
  const mappingStations = useMemo(() => {
    const stations: JSX.Element[] = [];
    // Start station
    if (startingStation) {
      stations.push(
        <StationMarker
          key="mapping-start"
          position={startingStation.position}
          type="start"
          id="start"
          isSelected={selectedStation === 'start'}
          isHovered={hoveredStation === 'start'}
          onClick={() => {
            console.log('Selecting mapping start station');
            setSelectedStation('start');
          }}
          onPointerOver={() => setHoveredStation('start')}
          onPointerOut={() => setHoveredStation(null)}
        />
      );
    }
    // Intermediate stations
    stationsOnPath.forEach(({ position, id }, i) => {
      if (i === 0) return; // Skip start station (already added)
      if (id === 'end' && isMapping) return; // Skip end station during active mapping
      stations.push(
        <StationMarker
          key={`mapping-station-${id}`}
          position={position}
          type={id === 'end' ? 'end' : 'station'}
          id={id}
          isSelected={selectedStation === id}
          isHovered={hoveredStation === id}
          onClick={() => {
            console.log(`Selecting mapping station: ${id}`);
            setSelectedStation(id);
          }}
          onPointerOver={() => setHoveredStation(id)}
          onPointerOut={() => setHoveredStation(null)}
        />
      );
    });
    return stations;
  }, [isMapping, startingStation, stationsOnPath, selectedStation, hoveredStation, setSelectedStation]);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: '#181a20' }}>
      <Canvas
        camera={{ position: [0, 0, 20], up: [0, 1, 0], fov: 50 }}
        style={{ width: '100vw', height: '100vh', background: '#181a20' }}
      >
        <ambientLight intensity={1.0} />
        <pointLight position={[0, 0, 20]} intensity={1.5} color="#00bfff" />
        <NeonGrid size={20} divisions={40} color="#00bfff" />
        <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[20, 20]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
        {/* Render selected path */}
        {paths.map((path) =>
          path.id === selectedPathId ? (
            <PathTube key={path.id} points={path.points} color="#00ffcc" />
          ) : null
        )}
        {/* Render current path during mapping */}
        {isMapping && currentPath.length >= 2 && (
          <PathTube points={currentPath} color="#00ffea" />
        )}
        {/* Render turtle */}
        <Turtle position={turtlePosition} rotation={turtleRotationDisplay} />
        {/* Render stations during mapping or after stopping */}
        {mappingStations}
        {/* Render stations for selected path */}
        {selectedPathStations}
      </Canvas>
      {/* Control panel with improved styling */}
      <div
        style={{
          position: 'absolute',
          top: '2vh',
          left: '2vw',
          background: 'hsl(240, 6%, 10%)',
          color: 'hsl(0,0%,98%)',
          padding: '1.5rem 1.25rem',
          borderRadius: '18px',
          minWidth: 'min(240px, 45vw)',
          maxWidth: 'min(300px, 50vw)',
          zIndex: 10,
          fontFamily: 'Inter, sans-serif',
          boxShadow: '0 6px 32px #000b',
          fontSize: 'clamp(0.9rem, 2vw, 1rem)',
          border: '1.5px solid hsl(240, 4%, 16%)',
          transition: 'box-shadow 0.2s',
        }}
      >
        <div style={{ marginBottom: '1.25rem', fontWeight: 700, fontSize: 'clamp(1.1rem, 2.5vw, 1.25rem)', letterSpacing: '0.5px' }}>
          Path Control
        </div>
        {/* Stations controls */}
        <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.625rem' }}>
          <span style={{ fontWeight: 500 }}>Stations</span>
          <button
            onClick={setStartingStation}
            disabled={isMissionRunning}
            style={{
              background: 'hsl(240, 80%, 60%)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '0.375rem 1.25rem',
              fontWeight: 600,
              opacity: isMissionRunning ? 0.5 : 1,
              boxShadow: '0 1px 4px #0003',
              transition: 'background 0.2s, transform 0.1s',
              fontSize: 'clamp(0.85rem, 2vw, 0.9375rem)',
            }}
            onMouseEnter={(e) => !isMissionRunning && (e.currentTarget.style.background = 'hsl(240, 80%, 70%)')}
            onMouseLeave={(e) => !isMissionRunning && (e.currentTarget.style.background = 'hsl(240, 80%, 60%)')}
          >
            Add Station
          </button>
        </div>
        {/* Mapping controls */}
        <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.625rem' }}>
          <span style={{ fontWeight: 500 }}>Mapping</span>
          <button
            onClick={startMapping}
            disabled={isMapping || isMissionRunning}
            style={{
              background: 'hsl(240, 5%, 18%)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '0.375rem 1.25rem',
              fontWeight: 600,
              opacity: isMapping || isMissionRunning ? 0.5 : 1,
              boxShadow: '0 1px 4px #0003',
              transition: 'background 0.2s, transform 0.1s',
              fontSize: 'clamp(0.85rem, 2vw, 0.9375rem)',
            }}
            onMouseEnter={(e) => !(isMapping || isMissionRunning) && (e.currentTarget.style.background = 'hsl(240, 5%, 24%)')}
            onMouseLeave={(e) => !(isMapping || isMissionRunning) && (e.currentTarget.style.background = 'hsl(240, 5%, 18%)')}
          >
            Start
          </button>
          <button
            onClick={stopMapping}
            disabled={!isMapping}
            style={{
              background: 'hsl(0, 80%, 40%)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '0.375rem 1.25rem',
              fontWeight: 600,
              opacity: !isMapping ? 0.5 : 1,
              boxShadow: '0 1px 4px #0003',
              transition: 'background 0.2s, transform 0.1s',
              fontSize: 'clamp(0.85rem, 2vw, 0.9375rem)',
            }}
            onMouseEnter={(e) => isMapping && (e.currentTarget.style.background = 'hsl(0, 80%, 50%)')}
            onMouseLeave={(e) => isMapping && (e.currentTarget.style.background = 'hsl(0, 80%, 40%)')}
          >
            Stop
          </button>
        </div>
        {/* Mission controls */}
        <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.625rem' }}>
          <span style={{ fontWeight: 500 }}>Mission</span>
          <button
            onClick={startMission}
            disabled={!selectedPathId || isMissionRunning}
            style={{
              background: 'hsl(240, 5%, 18%)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '0.375rem 1.25rem',
              fontWeight: 600,
              opacity: !selectedPathId || isMissionRunning ? 0.5 : 1,
              boxShadow: '0 1px 4px #0003',
              transition: 'background 0.2s, transform 0.1s',
              fontSize: 'clamp(0.85rem, 2vw, 0.9375rem)',
            }}
            onMouseEnter={(e) =>
              !(!selectedPathId || isMissionRunning) &&
              (e.currentTarget.style.background = 'hsl(240, 5%, 24%)')
            }
            onMouseLeave={(e) =>
              !(!selectedPathId || isMissionRunning) &&
              (e.currentTarget.style.background = 'hsl(240, 5%, 18%)')
            }
          >
            Start
          </button>
          {isMissionRunning && (
            <button
              onClick={stopMission}
              style={{
                background: 'hsl(0, 80%, 40%)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '0.375rem 1.25rem',
                fontWeight: 600,
                boxShadow: '0 1px 4px #0003',
                transition: 'background 0.2s, transform 0.1s',
                fontSize: 'clamp(0.85rem, 2vw, 0.9375rem)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'hsl(0, 80%, 50%)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'hsl(0, 80%, 40%)')}
            >
              Stop
            </button>
          )}
        </div>
        {/* Path selection */}
        <div style={{ marginBottom: '0.75rem' }}>
          <label style={{ color: '#fff', fontWeight: 'bold', marginRight: '0.5rem' }}>Select Path:</label>
          <select
            title="Select a path"
            value={selectedPathId ?? ''}
            onChange={(e) => {
              const value = e.target.value;
              setSelectedPathId(value === '' ? null : value);
            }}
            style={{
              padding: '0.5rem 0.75rem',
              borderRadius: '6px',
              backgroundColor: '#1a1a1a',
              color: '#fff',
              border: '1px solid #444',
              fontSize: 'clamp(0.9rem, 2vw, 1rem)',
              width: '100%',
              cursor: 'pointer',
              transition: 'border-color 0.2s, background 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#00bfff')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#444')}
          >
            <option value="">-- None --</option>
            {paths.map((path) => (
              <option key={path.id} value={path.id}>
                {path.name}
              </option>
            ))}
          </select>
        </div>
        {error && (
          <div style={{ color: '#ff69f6', marginTop: '0.625rem', fontWeight: 500 }}>{error}</div>
        )}
        {loading && (
          <div style={{ marginTop: '0.625rem', color: '#fff' }}>Loading...</div>
        )}
        {isMissionRunning && (
          <div style={{ color: '#00ffcc', marginTop: '0.625rem', fontWeight: 500 }}>Mission in progress...</div>
        )}
      </div>
      {toast && <Toast message={toast} />}
      <NamePathModal
        open={showNameModal}
        defaultName={pendingDefaultName}
        onSave={saveNamedPath}
        onCancel={cancelNamedPath}
      />
    </div>
  );
};

export default Scene;