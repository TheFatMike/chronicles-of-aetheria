import { worldObjects } from "../state";

export const GRID_SIZE = 50;

// Grid storage
export const entityGrid = new Map<string, Set<string>>();
export const objectGrid = new Map<string, Set<string>>();

export function getGridKey(pos: [number, number, number]): string {
  const x = Math.floor(pos[0] / GRID_SIZE);
  const z = Math.floor(pos[2] / GRID_SIZE);
  return `${x},${z}`;
}

export function updateInGrid(grid: Map<string, Set<string>>, id: string, oldPos: [number, number, number] | null, newPos: [number, number, number]) {
  if (oldPos) {
    const oldKey = getGridKey(oldPos);
    grid.get(oldKey)?.delete(id);
  }
  const newKey = getGridKey(newPos);
  if (!grid.has(newKey)) grid.set(newKey, new Set());
  grid.get(newKey)!.add(id);
}

export function getNearbyGridKeys(pos: [number, number, number], radius: number = GRID_SIZE): string[] {
  const centerX = Math.floor(pos[0] / GRID_SIZE);
  const centerZ = Math.floor(pos[2] / GRID_SIZE);
  const range = Math.ceil(radius / GRID_SIZE);
  
  const keys = [];
  for (let dx = -range; dx <= range; dx++) {
    for (let dz = -range; dz <= range; dz++) {
      keys.push(`${centerX + dx},${centerZ + dz}`);
    }
  }
  return keys;
}

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
  const nearbyKeys = getNearbyGridKeys(newPos, 10); // Check within 10 units range for collisions
  for (const key of nearbyKeys) {
    const ids = objectGrid.get(key);
    if (!ids) continue;

    for (const id of ids) {
      const obj = worldObjects.get(id);
      if (!obj) continue;

      const { pos, rot, type, scale } = obj;
      
      const s = scale || [1, 1, 1];
      const sx = Array.isArray(s) ? s[0] : (s.x ?? 1);
      const sy = Array.isArray(s) ? s[1] : (s.y ?? 1);
      const sz = Array.isArray(s) ? s[2] : (s.z ?? 1);
      const t = (type || "").toLowerCase();

      let shapeType = 'box';
      if (t.includes('tree') || t.includes('rock') || t.includes('npc') || t.includes('tent') || t.includes('spawner')) {
        shapeType = 'circle';
      }

      const local = toLocalSpace(newPos, pos, rot[1] || 0);
      const hTop = sy;

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
  }
  return false;
}

export function resolveWorldCollision(oldPos: [number, number, number], newPos: [number, number, number], radius: number = 0.25): [number, number, number] {
  let resolvedPos: [number, number, number] = [...newPos];
  const nearbyKeys = getNearbyGridKeys(resolvedPos, 10);

  for (const key of nearbyKeys) {
    const ids = objectGrid.get(key);
    if (!ids) continue;

    for (const id of ids) {
      const obj = worldObjects.get(id);
      if (!obj) continue;

      const { pos, rot, type, scale } = obj;
      const rotY = rot[1] || 0;
      const local = toLocalSpace(resolvedPos, pos, rotY);
      
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
  }
  return resolvedPos;
}

export function filterNearby<T extends { id: string, pos: [number, number, number] }>(
  items: T[],
  playerPos: [number, number, number],
  radius: number = 75,
  type: 'entity' | 'object' = 'entity'
): T[] {
  const radiusSq = radius * radius;
  const nearbyKeys = getNearbyGridKeys(playerPos, radius);
  const grid = type === 'entity' ? entityGrid : objectGrid;
  
  const result: T[] = [];
  const itemMap = new Map(items.map(i => [i.id, i]));

  for (const key of nearbyKeys) {
    const ids = grid.get(key);
    if (!ids) continue;

    for (const id of ids) {
      const item = itemMap.get(id);
      if (item) {
        const dx = item.pos[0] - playerPos[0];
        const dz = item.pos[2] - playerPos[2];
        if ((dx * dx + dz * dz) < radiusSq) {
          result.push(item);
        }
      }
    }
  }

  return result;
}
