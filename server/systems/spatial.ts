import { worldObjects } from "../state";

export const GRID_SIZE = 50;

/**
 * Transforms world coordinates to a local space relative to an object's position and rotation.
 */
export function toLocalSpace(worldPos: [number, number, number], objPos: [number, number, number], rotY: number): { x: number, z: number, y: number } {
  const dx = worldPos[0] - objPos[0];
  const dz = worldPos[2] - objPos[2];
  const cos = Math.cos(rotY);
  const sin = Math.sin(rotY);
  
  return {
    x: dx * cos - dz * sin,
    z: dx * sin + dz * cos,
    y: worldPos[1]
  };
}

/**
 * Transforms local push vector back to world space.
 */
export function toWorldVector(localX: number, localZ: number, rotY: number): { x: number, z: number } {
  const cos = Math.cos(rotY);
  const sin = Math.sin(rotY);
  return {
    x: localX * cos + localZ * sin,
    z: -localX * sin + localZ * cos
  };
}

export function checkWorldCollision(newPos: [number, number, number], radius: number = 0.25) {
  for (const obj of worldObjects.values()) {
    const { pos, rot, hitboxes } = obj;
    if (!hitboxes) continue;

    const local = toLocalSpace(newPos, pos, rot[1] || 0);

    for (const hb of hitboxes) {
      // Height check
      const hBase = hb.y || 0;
      const hTop = hBase + (hb.h || 4);
      if (local.y > hTop - 0.2 || local.y < hBase - 0.5) continue;

      if (hb.type === 'circle') {
        const hdx = local.x - hb.x;
        const hdz = local.z - hb.z;
        const distSq = hdx * hdx + hdz * hdz;
        const minDist = hb.r + radius;
        if (distSq < minDist * minDist) return true;
      } else if (hb.type === 'box') {
        const hdx = Math.abs(local.x - hb.x);
        const hdz = Math.abs(local.z - hb.z);
        if (hdx < (hb.w / 2 + radius) && hdz < (hb.d / 2 + radius)) return true;
      }
    }
  }
  return false;
}

export function resolveWorldCollision(oldPos: [number, number, number], newPos: [number, number, number], radius: number = 0.25): [number, number, number] {
  let resolvedPos: [number, number, number] = [...newPos];

  for (const obj of worldObjects.values()) {
    const { pos, rot, hitboxes } = obj;
    if (!hitboxes || hitboxes.length === 0) continue;

    const rotY = rot[1] || 0;
    const local = toLocalSpace(resolvedPos, pos, rotY);
    
    for (const hb of hitboxes) {
      // 3D Height Check
      const hBase = hb.y || 0;
      const hTop = hBase + (hb.h || 4);
      if (local.y > hTop - 0.2 || local.y < hBase - 0.5) continue;

      if (hb.type === 'circle') {
        const hdx = local.x - hb.x;
        const hdz = local.z - hb.z;
        const distSq = hdx * hdx + hdz * hdz;
        const minDist = hb.r + radius;
        
        if (distSq < minDist * minDist) {
          const dist = Math.sqrt(distSq);
          if (dist < 0.001) continue;

          const overlap = minDist - dist;
          const push = toWorldVector((hdx / dist) * overlap, (hdz / dist) * overlap, rotY);

          resolvedPos[0] += push.x;
          resolvedPos[2] += push.z;
        }
      } else if (hb.type === 'box') {
        const hdx = local.x - hb.x;
        const hdz = local.z - hb.z;
        const halfW = hb.w / 2 + radius;
        const halfD = hb.d / 2 + radius;

        if (Math.abs(hdx) < halfW && Math.abs(hdz) < halfD) {
          const overlapX = halfW - Math.abs(hdx);
          const overlapZ = halfD - Math.abs(hdz);

          let pushX = 0;
          let pushZ = 0;

          if (overlapX < overlapZ) {
            pushX = hdx > 0 ? overlapX : -overlapX;
          } else {
            pushZ = hdz > 0 ? overlapZ : -overlapZ;
          }

          const push = toWorldVector(pushX, pushZ, rotY);
          resolvedPos[0] += push.x;
          resolvedPos[2] += push.z;
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
