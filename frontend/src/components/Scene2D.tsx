import React, { useRef, useState, useEffect } from 'react';
import { Stage, Layer, Circle, Line, Text, Group } from 'react-konva';

// Types for station and path
interface Station {
  x: number;
  y: number;
  selected?: boolean;
}

interface Path {
  points: [number, number][];
}

interface TurtlePose {
  x: number;
  y: number;
  theta: number;
}

interface Scene2DProps {
  turtlePose: TurtlePose;
  stations: Station[];
  paths: Path[];
  width?: number;
  height?: number;
}

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 600;
const TURTLE_RADIUS = 15;
const STATION_RADIUS = 10;

// Helper to convert world coordinates to canvas coordinates
function worldToCanvas(x: number, y: number) {
  // turtlesim default is 11x11, map to canvas
  return [
    (x / 11) * CANVAS_WIDTH,
    CANVAS_HEIGHT - (y / 11) * CANVAS_HEIGHT // invert y for canvas
  ];
}

const Turtle: React.FC<{ pose: TurtlePose }> = ({ pose }) => {
  const [cx, cy] = worldToCanvas(pose.x, pose.y);
  const headLength = 20;
  const headX = cx + headLength * Math.cos(-pose.theta + Math.PI / 2);
  const headY = cy + headLength * Math.sin(-pose.theta + Math.PI / 2);
  return (
    <Group>
      <Circle x={cx} y={cy} radius={TURTLE_RADIUS} fill="green" shadowBlur={5} />
      {/* Turtle head direction */}
      <Line points={[cx, cy, headX, headY]} stroke="yellow" strokeWidth={4} />
    </Group>
  );
};

const StationDot: React.FC<{ station: Station; selected?: boolean }> = ({ station, selected }) => {
  const [cx, cy] = worldToCanvas(station.x, station.y);
  return (
    <Circle
      x={cx}
      y={cy}
      radius={STATION_RADIUS}
      fill={selected ? 'red' : 'blue'}
      shadowBlur={selected ? 10 : 5}
    />
  );
};

const PathLine: React.FC<{ points: [number, number][] }> = ({ points }) => {
  if (points.length < 2) return null;
  const canvasPoints = points.map(([x, y]) => worldToCanvas(x, y)).flat();
  return <Line points={canvasPoints} stroke="orange" strokeWidth={4} lineCap="round" />;
};

const Scene2D: React.FC<Scene2DProps> = ({ turtlePose, stations, paths, width = CANVAS_WIDTH, height = CANVAS_HEIGHT }) => {
  return (
    <Stage width={width} height={height} style={{ background: '#f0f0f0', border: '2px solid #333' }}>
      <Layer>
        {/* Draw grid */}
        {[...Array(12)].map((_, i) => (
          <Line
            key={`hgrid-${i}`}
            points={[0, (i * height) / 11, width, (i * height) / 11]}
            stroke="#ddd"
            strokeWidth={1}
          />
        ))}
        {[...Array(12)].map((_, i) => (
          <Line
            key={`vgrid-${i}`}
            points={[(i * width) / 11, 0, (i * width) / 11, height]}
            stroke="#ddd"
            strokeWidth={1}
          />
        ))}
        {/* Draw paths */}
        {paths.map((path, i) => (
          <PathLine key={i} points={path.points} />
        ))}
        {/* Draw stations */}
        {stations.map((station, i) => (
          <StationDot key={i} station={station} selected={station.selected} />
        ))}
        {/* Draw turtle */}
        <Turtle pose={turtlePose} />
        {/* Labels */}
        <Text text="TurtleSim 2D Canvas" x={10} y={10} fontSize={18} fill="#333" />
      </Layer>
    </Stage>
  );
};

export default Scene2D; 