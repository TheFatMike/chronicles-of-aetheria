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
import { resolveMovementCollision, resolveOverlap, DEFAULT_COLLISION_CONFIG } from "../../shared/logic/collision";
import { getInterpolatedHeight } from "../../shared/logic/terrain";

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

/**
 * Reusable keys array to avoid GC pressure in hot loops.
 */
const _gridKeysPool: string[] = [];

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
 * Optimized version for internal use that populates an existing array.
 */
function populateNearbyGridKeys(pos: [number, number, number], radius: number, outKeys: string[]) {
  outKeys.length = 0;
  const centerX = Math.floor(pos[0] / GRID_SIZE);
  const centerZ = Math.floor(pos[2] / GRID_SIZE);
  const range = Math.ceil(radius / GRID_SIZE);
  
  for (let dx = -range; dx <= range; dx++) {
    for (let dz = -range; dz <= range; dz++) {
      outKeys.push(`${centerX + dx},${centerZ + dz}`);
    }
  }
}

/**
 * Checks if at least one player is within the specified radius using the spatial grid.
 * Extremely efficient for LOD checks.
 */
export function isAnyPlayerNearby(pos: [number, number, number], radius: number): boolean {
  const nearbyKeys = getNearbyGridKeys(pos, radius);
  const radiusSq = radius * radius;

  for (const key of nearbyKeys) {
    const occupantIds = entityGrid.get(key);
    if (!occupantIds) continue;

    for (const id of occupantIds) {
      const player = players.get(id);
      if (player) {
        const dx = player.pos[0] - pos[0];
        const dz = player.pos[2] - pos[2];
        if (dx * dx + dz * dz < radiusSq) return true;
      }
    }
  }
  return false;
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

const PUSHBACK_DIRECTIONS = [
  [1,0,0], [-1,0,0], [0,0,1], [0,0,-1],
  [0.7,0,0.7], [-0.7,0,0.7], [0.7,0,-0.7], [-0.7,0,-0.7]
];

export async function resolveWorldCollision(oldPos: [number, number, number], newPos: [number, number, number], radius: number = 0.4): Promise<[number, number, number]> {
  const startPos = new THREE.Vector3(oldPos[0], oldPos[1], oldPos[2]);
  const velocity = new THREE.Vector3(newPos[0] - oldPos[0], 0, newPos[2] - oldPos[2]);
  
  if (velocity.lengthSq() < 0.0001) {
    return newPos;
  }

  const nearbyKeys = getNearbyGridKeys(newPos, 15);
  const collidables: THREE.Object3D[] = [];

  for (const key of nearbyKeys) {
    const ids = objectGrid.get(key);
    if (!ids) continue;

    for (const id of ids) {
      const obj = worldObjects.get(id);
      if (!obj || !obj.type) continue;

      const t = obj.type.toLowerCase();
      if (t.startsWith('npc_') || t.startsWith('spawner_')) continue;

      // Use the cached mesh instance if available, otherwise load and cache it
      let mesh = meshInstances.get(id);
      if (!mesh) {
        const loaded = await loadModelMesh(t);
        if (loaded) {
          const s = normalizeScale(obj.scale);
          mesh = loaded.mesh.clone(true); // Server-side clone for unique transform
          mesh.position.set(obj.pos[0], obj.pos[1], obj.pos[2]);
          mesh.rotation.set(obj.rot[0], obj.rot[1], obj.rot[2]);
          mesh.scale.set(s[0], s[1], s[2]);
          mesh.updateMatrixWorld(true);
          meshInstances.set(id, mesh);
        }
      }

      if (mesh) {
        const distSq = getDistanceSq2D(newPos, obj.pos);
        const s = normalizeScale(obj.scale);
        const maxDim = Math.max(s[0], s[1], s[2]) * 5;
        if (distSq < maxDim * maxDim) {
          collidables.push(mesh);
        }
      }
    }
  }

  // Use the shared robust logic (delta=1.0 as velocity is the total frame move)
  const resolution = resolveMovementCollision(startPos, velocity, 1.0, collidables, {
    ...DEFAULT_COLLISION_CONFIG,
    radius: radius
  });

  // Maintain intended Y unless we stepped up
  const finalY = resolution.stepped ? resolution.position.y : newPos[1];

  return [resolution.position.x, finalY, resolution.position.z];
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
  let groundHeight = -100; // Lowered from 0 to allow holes below sea level

  // 1. Check Terrain
  if (terrainData) {
    groundHeight = getInterpolatedHeight(pos[0], pos[2], terrainData, 2);
  }

  // 2. Check Objects
  const nearbyKeys = getNearbyGridKeys(pos, 15); // Broad search for meshes
  for (const key of nearbyKeys) {
    const ids = objectGrid.get(key);
    if (!ids) continue;

    for (const id of ids) {
      const obj = worldObjects.get(id);
      if (!obj) continue;
      
      const t = (obj.type || "").toLowerCase();
      if (t.startsWith('npc_') || t.startsWith('spawner_')) continue;

      // Use cached mesh instance
      let mesh = meshInstances.get(id);
      if (!mesh) {
        const loaded = await loadModelMesh(t);
        if (loaded) {
          const s = normalizeScale(obj.scale);
          mesh = loaded.mesh.clone(true);
          mesh.position.set(obj.pos[0], obj.pos[1], obj.pos[2]);
          mesh.rotation.set(obj.rot[0], obj.rot[1], obj.rot[2]);
          mesh.scale.set(s[0], s[1], s[2]);
          mesh.updateMatrixWorld(true);
          meshInstances.set(id, mesh);
        }
      }

      if (mesh) {
        const s = normalizeScale(obj.scale);
        const maxDim = Math.max(s[0], s[1], s[2]) * 5;
        const distSq = getDistanceSq2D(pos, obj.pos);
        
        if (distSq < maxDim * maxDim) {
          const meshY = getMeshHeightAt(mesh, pos);
          if (meshY !== null) {
            groundHeight = Math.max(groundHeight, meshY);
          }
        }
      }
    }
  }

  return groundHeight;
}
