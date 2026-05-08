
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

export function resolveWorldCollision(oldPos: [number, number, number], newPos: [number, number, number], radius: number = 0.25): [number, number, number] {
  let resolvedPos: [number, number, number] = [...newPos];
  let collided = false;

  for (const obj of worldObjects.values()) {
    const { pos, rot, hitboxes } = obj;
    if (!hitboxes || hitboxes.length === 0) continue;

    const theta = rot[1] || 0; 
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);

    // Transform newPos to local space
    const dx = resolvedPos[0] - pos[0];
    const dz = resolvedPos[2] - pos[2];
    const localX = dx * cos - dz * sin;
    const localZ = dx * sin + dz * cos;
    
    // Player vertical bounds (approximate)
    const playerY = resolvedPos[1];

    for (const hb of hitboxes) {
      // --- 3D HEIGHT CHECK ---
      const hBase = hb.y || 0;
      const hTop = hBase + (hb.h || 4);
      
      // If player is significantly above the hitbox, or below its base (e.g. falling through), skip
      // We use a small buffer (0.2) to allow "stepping up"
      if (playerY > hTop - 0.2 || playerY < hBase - 0.5) continue;

      if (hb.type === 'circle') {
        const hdx = localX - hb.x;
        const hdz = localZ - hb.z;
        const distSq = hdx * hdx + hdz * hdz;
        const minDist = hb.r + radius;
        
        if (distSq < minDist * minDist) {
          collided = true;
          const dist = Math.sqrt(distSq);
          if (dist < 0.001) continue; // Avoid division by zero

          // Push out in local space
          const overlap = minDist - dist;
          const pushX = (hdx / dist) * overlap;
          const pushZ = (hdz / dist) * overlap;

          // Transform push back to world space
          const worldPushX = pushX * cos + pushZ * sin;
          const worldPushZ = -pushX * sin + pushZ * cos;

          resolvedPos[0] += worldPushX;
          resolvedPos[2] += worldPushZ;
        }
      } else if (hb.type === 'box') {
        const hdx = localX - hb.x;
        const hdz = localZ - hb.z;
        const halfW = hb.w / 2 + radius;
        const halfD = hb.d / 2 + radius;

        if (Math.abs(hdx) < halfW && Math.abs(hdz) < halfD) {
          collided = true;
          const overlapX = halfW - Math.abs(hdx);
          const overlapZ = halfD - Math.abs(hdz);

          let pushX = 0;
          let pushZ = 0;

          if (overlapX < overlapZ) {
            pushX = hdx > 0 ? overlapX : -overlapX;
          } else {
            pushZ = hdz > 0 ? overlapZ : -overlapZ;
          }

          // Transform push back to world space
          const worldPushX = pushX * cos + pushZ * sin;
          const worldPushZ = -pushX * sin + pushZ * cos;

          resolvedPos[0] += worldPushX;
          resolvedPos[2] += worldPushZ;
        }
      }
    }
  }

  return resolvedPos;
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
