/**
 * @file server/systems/spatial.ts
 * @description Implements a grid-based spatial partitioning system.
 * Used for efficient collision detection, proximity filtering, and localized network updates.
 * @importance Essential: Crucial for server performance, allowing the engine to handle many entities by limiting calculations to nearby objects.
 */
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
  items: Map<string, T> | T[],
  playerPos: [number, number, number],
  radius: number = 75,
  type: 'entity' | 'object' = 'entity'
): T[] {
  const radiusSq = radius * radius;
  const nearbyKeys = getNearbyGridKeys(playerPos, radius);
  const grid = type === 'entity' ? entityGrid : objectGrid;
  
  const result: T[] = [];
  const isMap = items instanceof Map;
  const itemMap = isMap ? (items as Map<string, T>) : null;
  const itemArray = isMap ? null : (items as T[]);

  for (const key of nearbyKeys) {
    const ids = grid.get(key);
    if (!ids) continue;

    for (const id of ids) {
      let item: T | undefined;
      
      if (itemMap) {
        item = itemMap.get(id);
      } else if (itemArray) {
        // Optimized: only look for it if we don't have a map, but we should really always use maps
        item = itemArray.find(i => i.id === id);
      }
      
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

export function getGroundHeight(pos: [number, number, number], terrainData: any): number {
  let groundHeight = -100;

  // 1. Check Terrain
  if (terrainData) {
    const x = Math.round(pos[0]);
    const z = Math.round(pos[2]);
    const key = `${x}_${z}`;
    if (terrainData[key]) {
      groundHeight = terrainData[key].y;
    }
  }

  // 2. Check Objects
  const nearbyKeys = getNearbyGridKeys(pos, 5);
  for (const key of nearbyKeys) {
    const ids = objectGrid.get(key);
    if (!ids) continue;

    for (const id of ids) {
      const obj = worldObjects.get(id);
      if (!obj) continue;
      const { pos: objPos, rot, scale, type } = obj;
      const s = scale || 1;
      const sx = Array.isArray(s) ? s[0] : (typeof s === 'number' ? s : (s.x ?? 1));
      const sy = Array.isArray(s) ? s[1] : (typeof s === 'number' ? s : (s.y ?? 1));
      const sz = Array.isArray(s) ? s[2] : (typeof s === 'number' ? s : (s.z ?? 1));

      const local = toLocalSpace(pos, objPos, rot[1] || 0);
      
      // If we are within the horizontal bounds of the object
      const t = (type || "").toLowerCase();
      let isInside = false;
      
      // Rough estimation of object bounds based on type
      let width = sx;
      let depth = sz;
      let height = sy;

      if (t === 'house' || t === 'tower_base') { width *= 8; depth *= 8; height *= 6; }
      if (t === 'well') { width *= 3; depth *= 3; height *= 2; }
      if (t === 'barrel') { width *= 0.8; depth *= 0.8; height *= 1.2; }
      if (t === 'chest') { width *= 1.2; depth *= 0.8; height *= 0.8; }
      if (t === 'tent') { width *= 400; depth *= 400; height *= 300; } // Adjusted for tent's weird 0.01 scale

      if (t.includes('tree') || t.includes('rock') || t.includes('npc')) {
        const radiusSq = Math.pow(width / 2, 2);
        isInside = (local.x * local.x + local.z * local.z) < radiusSq;
      } else {
        isInside = Math.abs(local.x) < width / 2 && Math.abs(local.z) < depth / 2;
      }

      if (isInside) {
        const topY = objPos[1] + height;
        const bottomY = objPos[1];
        
        // If we are vertically within the object's range (with some margin), 
        // consider its top as the ground to stand on.
        if (pos[1] >= bottomY - 0.5 && pos[1] <= topY + 1.0) {
          groundHeight = Math.max(groundHeight, topY);
        }
      }
    }
  }

  return groundHeight;
}
