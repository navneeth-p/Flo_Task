// src/utils.ts
export const clampTurtlePoint = ([x, y, z]: [number, number, number]): [number, number, number] => [
  Math.max(-10, Math.min(10, x)),
  Math.max(-10, Math.min(10, y)),
  z,
];

export function filterPathPoints(points: [number, number, number][], minDist = 0.2) {
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