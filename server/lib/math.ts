/**
 * @file server/lib/math.ts
 * @description Common mathematical utility functions for the server.
 */

export function getDistanceSq(pos1: [number, number, number], pos2: [number, number, number]): number {
  const dx = pos1[0] - pos2[0];
  const dy = pos1[1] - pos2[1];
  const dz = pos1[2] - pos2[2];
  return dx * dx + dy * dy + dz * dz;
}

export function getDistance(pos1: [number, number, number], pos2: [number, number, number]): number {
  return Math.sqrt(getDistanceSq(pos1, pos2));
}

export function isWithinRange(pos1: [number, number, number], pos2: [number, number, number], range: number): boolean {
  return getDistanceSq(pos1, pos2) <= range * range;
}
