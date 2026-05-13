/**
 * @file server/systems/spatial.ts
 * @description Implements a grid-based spatial partitioning system.
 * Used for efficient collision detection, proximity filtering, and localized network updates.
 * @importance Essential: Crucial for server performance, allowing the engine to handle many entities by limiting calculations to nearby objects.
 */
import { worldObjects, players } from "../state";
import * as THREE from 'three';
import { loadModelMesh, getMeshHeightAt } from "../lib/meshLoader";
import { getDistanceSq2D, getDistance2D, normalizeScale, getScaleRadius } from "../../shared/logic/math";

// Cache for loaded THREE groups associated with objects
export const meshInstances = new Map<string, THREE.Group>();
const REUSABLE_RAYCASTER = new THREE.Raycaster();
(REUSABLE_RAYCASTER as any).firstHitOnly = true;

const _tempVec = new THREE.Vector3();
const _tempDir = new THREE.Vector3();
const _tempPos = new THREE.Vector3();
const _tempRot = new THREE.Euler();
const _tempScale = new THREE.Vector3();

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
    const oldSet = grid.get(oldKey);
    if (oldSet) {
      oldSet.delete(id);
      if (oldSet.size === 0) grid.delete(oldKey);
    }
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
 * Broadcasts a socket event only to players within a specific radius.
 */
export function broadcastToNearbyPlayers(io: any, pos: [number, number, number], radius: number, event: string, payload: any, excludeId?: string) {
  const nearbyKeys = getNearbyGridKeys(pos, radius);
  const processed = new Set<string>();
  if (excludeId) processed.add(excludeId);
  
  for (const key of nearbyKeys) {
    const occupantIds = entityGrid.get(key);
    if (!occupantIds) continue;

    for (const otherId of occupantIds) {
      if (processed.has(otherId)) continue;
      
      const otherPlayer = players.get(otherId);
      if (otherPlayer) {
        io.to(otherId).emit(event, payload);
        processed.add(otherId);
      }
    }
  }
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

export function getObjectDimensions(type: string, scale: any) {
  const t = (type || "").toLowerCase();
  
  // World objects now use mesh-based collision instead of primitives.
  // We only keep primitive dimensions for entities that don't have static world meshes.
  if (t === 'npc' || t === 'enemy' || t === 'spawner') {
    const s = normalizeScale(scale);
    return { width: s[0], height: s[1], depth: s[2], shapeType: 'circle' };
  }

  return null;
}

export async function resolveWorldCollision(oldPos: [number, number, number], newPos: [number, number, number], radius: number = 0.25): Promise<[number, number, number]> {
  let resolvedPos: [number, number, number] = [...newPos];
  const nearbyKeys = getNearbyGridKeys(resolvedPos, 10);

  for (const key of nearbyKeys) {
    const ids = objectGrid.get(key);
    if (!ids) continue;

    for (const id of ids) {
      const obj = worldObjects.get(id);
      if (!obj) continue;

      const { pos, rot, type, scale } = obj;
      const t = (type || "").toLowerCase();

      // 1. Try Mesh Collision first
      const loaded = await loadModelMesh(t);
      if (loaded) {
        const mesh = loaded.mesh;
        
        // Temporarily move the SHARED mesh to the object's position for collision check
        // Since Node.js is single-threaded and we are in an async function, 
        // we must be careful. However, we don't await between setting mesh pos and raycasting.
        _tempPos.set(pos[0], pos[1], pos[2]);
        _tempRot.set(rot[0], rot[1], rot[2]);
        const s = normalizeScale(scale);
        _tempScale.set(s[0], s[1], s[2]);
        
        mesh.position.copy(_tempPos);
        mesh.rotation.copy(_tempRot);
        mesh.scale.copy(_tempScale);
        mesh.updateMatrixWorld();

        // Mesh-based pushback: check 8 directions around the player
        const directions = [
          [1,0,0], [-1,0,0], [0,0,1], [0,0,-1],
          [0.7,0,0.7], [-0.7,0,0.7], [0.7,0,-0.7], [-0.7,0,-0.7]
        ];

        for (const [dx, dy, dz] of directions) {
          _tempDir.set(dx, dy, dz);
          // Cast from slightly above ground
          _tempVec.set(resolvedPos[0], resolvedPos[1] + 0.5, resolvedPos[2]);
          REUSABLE_RAYCASTER.set(_tempVec, _tempDir);
          
          const intersects = REUSABLE_RAYCASTER.intersectObject(mesh, true);
          if (intersects.length > 0 && intersects[0].distance < radius) {
            const pushDist = radius - intersects[0].distance;
            resolvedPos[0] -= _tempDir.x * pushDist;
            resolvedPos[2] -= _tempDir.z * pushDist;
          }
        }
        continue;
      }

      // 2. Fallback to primitive if it's an NPC or has no mesh
      const dims = getObjectDimensions(type, scale);
      if (!dims) continue;

      const rotY = rot[1] || 0;
      const local = toLocalSpace(resolvedPos, pos, rotY);
      const { width, height, depth, shapeType } = dims;
      const hTop = height;

      if (local.y >= -0.5 && local.y <= hTop) {
        if (shapeType === 'circle') {
          const hdx = local.x;
          const hdz = local.z;
          const distSq = hdx * hdx + hdz * hdz;
          const minDist = width / 2 + radius;
          
          if (distSq < minDist * minDist) {
            const dist = Math.sqrt(distSq);
            if (dist < 0.001) continue;

            const overlap = minDist - dist;
            const push = toWorldVector((hdx / dist) * overlap, (hdz / dist) * overlap, rotY);

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

  for (const key of nearbyKeys) {
    const ids = grid.get(key);
    if (!ids) continue;

    for (const id of ids) {
      let item: T | undefined;
      
      if (itemMap) {
        item = itemMap.get(id);
      } else {
        // If it's an array, we have to find it. But we should really avoid this.
        item = (items as T[]).find(i => i.id === id);
      }
      
      if (item) {
        if (getDistanceSq2D(item.pos, playerPos) < radiusSq) {
          result.push(item);
        }
      }
    }
  }

  return result;
}

export async function getGroundHeight(pos: [number, number, number], terrainData: any): Promise<number> {
  let groundHeight = 0; // Default to sea level instead of -100 to prevent 'falling through the world' logic errors

  // 1. Check Terrain
  if (terrainData) {
    const x = Math.round(pos[0]);
    const z = Math.round(pos[2]);
    const key = `${x}_${z}`;
    const data = terrainData.get(key);
    if (data) {
      groundHeight = data.y;
    }
  }

  // 2. Check Objects
  const nearbyKeys = getNearbyGridKeys(pos, 15); // Broad search for meshes
  for (const key of nearbyKeys) {
    const ids = objectGrid.get(key);
    if (!ids) continue;

    for (const id of ids) {
      const obj = worldObjects.get(id);
      if (!obj) continue;
      const { pos: objPos, rot, scale, type } = obj;
      
      // Try to load mesh for ALL objects (Mesh-First)
      const t = (type || "").toLowerCase();
      const loaded = await loadModelMesh(t);
      if (loaded) {
        const mesh = loaded.mesh;
        _tempPos.set(objPos[0], objPos[1], objPos[2]);
        _tempRot.set(rot[0], rot[1], rot[2]);
        
        const s = normalizeScale(scale);
        _tempScale.set(s[0], s[1], s[2]);
        
        mesh.position.copy(_tempPos);
        mesh.rotation.copy(_tempRot);
        mesh.scale.copy(_tempScale);
        mesh.updateMatrixWorld();

        const meshY = getMeshHeightAt(mesh, pos);
        if (meshY !== null) {
          groundHeight = Math.max(groundHeight, meshY);
          continue; 
        }
      }

      // Fallback to primitive for entities (NPCs/Spawners)
      const dims = getObjectDimensions(type, scale);
      if (!dims) continue;

      const { width, height, shapeType } = dims;
      const local = toLocalSpace(pos, objPos, rot[1] || 0);
      let isInside = false;

      if (shapeType === 'circle') {
        const radiusSq = Math.pow(width / 2, 2);
        isInside = (local.x * local.x + local.z * local.z) < radiusSq;
      }

      if (isInside) {
        const topY = objPos[1] + height;
        const bottomY = objPos[1];
        if (pos[1] >= bottomY - 0.5 && pos[1] <= topY + 1.0) {
          groundHeight = Math.max(groundHeight, topY);
        }
      }
    }
  }

  return groundHeight;
}
