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
    const { pos, rot, hitboxes, type, scale } = obj;
    
    // --- SMART SHAPE INFERENCE ---
    const s = scale || [1, 1, 1];
    const sx = Array.isArray(s) ? s[0] : (s.x ?? 1);
    const sy = Array.isArray(s) ? s[1] : (s.y ?? 1);
    const sz = Array.isArray(s) ? s[2] : (s.z ?? 1);
    const t = (type || "").toLowerCase();

    // 1. Determine Shape Type
    let shapeType = 'box';
    if (t.includes('tree') || t.includes('rock') || t.includes('npc') || t.includes('tent') || t.includes('spawner')) {
      shapeType = 'circle';
    }

    const local = toLocalSpace(newPos, pos, rot[1] || 0);
    const hTop = sy;

    // 2. Perform Collision Check
    if (local.y >= -0.5 && local.y <= hTop) {
      if (shapeType === 'circle') {
        const radiusSq = Math.pow((sx / 2 + radius), 2);
        const distSq = local.x * local.x + local.z * local.z;
        if (distSq < radiusSq) return true;
      } else {
        const halfW = sx / 2 + radius;
        const halfD = sz / 2 + radius;
        if (Math.abs(local.x) < halfW && Math.abs(local.z) < halfD) return true;
      }
    }
  }
  return false;
}

export function resolveWorldCollision(oldPos: [number, number, number], newPos: [number, number, number], radius: number = 0.25): [number, number, number] {
  let resolvedPos: [number, number, number] = [...newPos];

  for (const obj of worldObjects.values()) {
    const { pos, rot, hitboxes, type, scale } = obj;
    const rotY = rot[1] || 0;
    const local = toLocalSpace(resolvedPos, pos, rotY);
    
    // --- SMART SHAPE INFERENCE ---
    const s = scale || [1, 1, 1];
    const sx = Array.isArray(s) ? s[0] : (s.x ?? 1);
    const sy = Array.isArray(s) ? s[1] : (s.y ?? 1);
    const sz = Array.isArray(s) ? s[2] : (s.z ?? 1);
    const t = (type || "").toLowerCase();

    let shapeType = 'box';
    if (t.includes('tree') || t.includes('rock') || t.includes('npc') || t.includes('tent') || t.includes('spawner')) {
      shapeType = 'circle';
    }

    const hTop = sy;

    if (local.y >= -0.5 && local.y <= hTop) {
      if (shapeType === 'circle') {
        const hdx = local.x;
        const hdz = local.z;
        const distSq = hdx * hdx + hdz * hdz;
        const minDist = sx / 2 + radius;
        
        if (distSq < minDist * minDist) {
          const dist = Math.sqrt(distSq);
          if (dist < 0.001) continue;

          const overlap = minDist - dist;
          const push = toWorldVector((hdx / dist) * overlap, (hdz / dist) * overlap, rotY);

          resolvedPos[0] += push.x;
          resolvedPos[2] += push.z;
        }
      } else {
        const halfW = sx / 2 + radius;
        const halfD = sz / 2 + radius;

        if (Math.abs(local.x) < halfW && Math.abs(local.z) < halfD) {
          const overlapX = halfW - Math.abs(local.x);
          const overlapZ = halfD - Math.abs(local.z);

          let pushX = 0;
          let pushZ = 0;

          if (overlapX < overlapZ) {
            pushX = local.x > 0 ? overlapX : -overlapX;
          } else {
            pushZ = local.z > 0 ? overlapZ : -overlapZ;
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
