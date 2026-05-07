
import { worldObjects } from "../state";

export const GRID_SIZE = 50;

export function checkWorldCollision(newPos: [number, number, number], radius: number = 0.25) {
  for (const obj of worldObjects.values()) {
    const { pos, rot, hitboxes } = obj;
    const theta = rot[1] || 0; 
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);

    const dx = newPos[0] - pos[0];
    const dz = newPos[2] - pos[2];
    const localX = dx * cos - dz * sin;
    const localZ = dx * sin + dz * cos;

    if (!hitboxes) continue;
    for (const hb of hitboxes) {
      if (hb.type === 'circle') {
        const hdx = localX - hb.x;
        const hdz = localZ - hb.z;
        const distSq = hdx * hdx + hdz * hdz;
        const minDist = hb.r + radius;
        if (distSq < minDist * minDist) return true;
      } else if (hb.type === 'box') {
        const hdx = Math.abs(localX - hb.x);
        const hdz = Math.abs(localZ - hb.z);
        if (hdx < (hb.w / 2 + radius) && hdz < (hb.d / 2 + radius)) return true;
      }
    }
  }
  return false;
}

export function getGridKey(pos: [number, number, number]): string {
  const x = Math.floor(pos[0] / GRID_SIZE);
  const z = Math.floor(pos[2] / GRID_SIZE);
  return `${x},${z}`;
}

export function getNearbyGridKeys(pos: [number, number, number]): string[] {
  const x = Math.floor(pos[0] / GRID_SIZE);
  const z = Math.floor(pos[2] / GRID_SIZE);
  const keys = [];
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      keys.push(`${x + dx},${z + dz}`);
    }
  }
  return keys;
}

export function filterNearby<T extends { pos: [number, number, number] }>(
  items: T[],
  playerPos: [number, number, number],
  radius: number = 75
): T[] {
  const radiusSq = radius * radius;
  return items.filter(item => {
    const dx = item.pos[0] - playerPos[0];
    const dz = item.pos[2] - playerPos[2];
    return (dx * dx + dz * dz) < radiusSq;
  });
}
