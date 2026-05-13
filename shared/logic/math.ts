/**
 * @file shared/logic/math.ts
 * @description Shared math utilities for distance, scales, and vectors.
 */

/**
 * Calculates the Euclidean distance squared between two 3D positions on the XZ plane.
 * Useful for proximity checks where height doesn't matter.
 */
export function getDistanceSq2D(pos1: [number, number, number], pos2: [number, number, number]): number {
  const dx = pos1[0] - pos2[0];
  const dz = pos1[2] - pos2[2];
  return dx * dx + dz * dz;
}

/**
 * Calculates the Euclidean distance between two 3D positions on the XZ plane.
 */
export function getDistance2D(pos1: [number, number, number], pos2: [number, number, number]): number {
  return Math.sqrt(getDistanceSq2D(pos1, pos2));
}

/**
 * Normalizes a scale value (number or array) into an array of 3 numbers.
 */
export function normalizeScale(scale: number | number[] | undefined | null): [number, number, number] {
  if (scale === undefined || scale === null) return [1, 1, 1];
  if (typeof scale === 'number') return [scale, scale, scale];
  if (Array.isArray(scale)) {
    return [
      scale[0] ?? 1,
      scale[1] ?? (scale[0] ?? 1),
      scale[2] ?? (scale[0] ?? 1)
    ];
  }
  return [1, 1, 1];
}

/**
 * Gets the radius for a given scale (assumes uniform or uses X-axis for circle-based logic).
 */
export function getScaleRadius(scale: number | number[] | undefined | null): number {
  const normalized = normalizeScale(scale);
  return normalized[0] / 2;
}
