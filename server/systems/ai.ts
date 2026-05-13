/**
 * @file server/systems/ai.ts
 * @description Manages the artificial intelligence logic for all non-player entities.
 * Handles patrolling, aggro states, pathfinding, and combat decision-making.
 * @importance Essential: Drives the behavior of enemies and NPCs, making the game world feel alive and challenging.
 */
import { entities, worldObjects, dirtyEntities, terrainData, players } from "../state";
import { resolveWorldCollision, updateInGrid, entityGrid, objectGrid, getGroundHeight, isAnyPlayerNearby } from "./spatial";

const waypointCache = new Map<string, any[]>();

export const clearAICache = () => waypointCache.clear();

const getWaypointsForPath = (pathId: string) => {
  if (waypointCache.has(pathId)) return waypointCache.get(pathId)!;
  
  const waypoints = Array.from(worldObjects.values())
    .filter(obj => obj.type === 'waypoint' && obj.pathId === pathId)
    .sort((a, b) => (Number(a.waypointId) || 0) - (Number(b.waypointId) || 0));
  
  waypointCache.set(pathId, waypoints);
  return waypoints;
};

export const initAIWorker = () => {
  // Gracefully bypassed: Native Node 24 worker_threads ESM resolution fails with tsx loader in some Windows environments.
  // Using standard synchronous tick within the decoupled game loop instead.
};

let aiTickCount = 0;

/**
 * Updates entity AI with LOD (Level of Detail) and Interleaving.
 */
export const updateEntityAI = async (tickTime: number) => {
  const dt = tickTime / 1000;
  aiTickCount++;

  let index = 0;
  for (const entity of entities.values()) {
    index++;
    if (entity.isDead) continue;

    // 1. Interleaving: Process movement/gravity every tick, but complex AI every other tick
    const isAITick = (index + aiTickCount) % 2 === 0;

    // 2. Proximity Check (LOD): Sleep if no players are nearby (150 meters)
    // Uses the spatial grid for O(1) lookups instead of O(P)
    if (aiTickCount % 10 === 0 || entity.isSleeping === undefined) {
      entity.isSleeping = !isAnyPlayerNearby(entity.pos, 150);
    }

    if (entity.isSleeping && entity.type !== 'npc') continue;

    // Avoid creating new arrays every tick
    const ox = entity.pos[0], oy = entity.pos[1], oz = entity.pos[2];
    const oldAIState = entity.aiState;

    // 3. Gravity & Ground Detection
    if (entity.type !== 'npc') {
      const currentGroundY = await getGroundHeight(entity.pos, terrainData);
      const GRAVITY = 20;

      if (entity.pos[1] > currentGroundY) {
        entity.velocity = entity.velocity || { x: 0, y: 0, z: 0 };
        entity.velocity.y -= GRAVITY * dt;
        entity.pos[1] += entity.velocity.y * dt;
        
        if (entity.pos[1] <= currentGroundY) {
          entity.pos[1] = currentGroundY;
          entity.velocity.y = 0;
        }
        dirtyEntities.add(entity.id);
      } else if (entity.pos[1] < currentGroundY) {
        entity.pos[1] = currentGroundY;
        dirtyEntities.add(entity.id);
      }
    }

    // 4. Horizontal Movement AI (Skip for NPCs and sleeping entities)
    if (entity.type === 'npc' || entity.isSleeping || !isAITick) continue;

    const speed = entity.stats.moveSpeed * dt * 2; // Compensate for interleaving
    
    const moveWithCollision = async (dx: number, dz: number, s: number) => {
      const mag = Math.sqrt(dx*dx + dz*dz);
      if (mag < 0.01) return;
      const nx = (dx/mag) * s;
      const nz = (dz/mag) * s;
      
      const nextPos: [number, number, number] = [entity.pos[0] + nx, entity.pos[1], entity.pos[2] + nz];
      entity.pos = await resolveWorldCollision(entity.pos, nextPos, 0.5);
    };

    switch (entity.aiState) {
      case 'IDLE':
        if (Math.random() < 0.05) {
          entity.rot[1] += (Math.random() - 0.5) * 2;
          dirtyEntities.add(entity.id);
        }
        break;
      case 'RETURN':
        const hPos = entity.homePos || entity.pos;
        const rdx = hPos[0] - entity.pos[0];
        const rdz = hPos[2] - entity.pos[2];
        const rdSq = rdx*rdx + rdz*rdz;
        if (rdSq < 0.25) { 
          entity.aiState = entity.pathId ? 'PATROL' : 'IDLE';
          entity.isMoving = false;
        } else {
          entity.isMoving = true;
          await moveWithCollision(rdx, rdz, speed * 1.5);
        }
        break;
      case 'PATROL': {
        if (!entity.pathId) {
          entity.aiState = 'IDLE';
          break;
        }

        const waypoints = getWaypointsForPath(entity.pathId);
        if (waypoints.length === 0) {
          entity.aiState = 'RETURN';
          break;
        }

        const targetWP = waypoints[(entity.currentWaypointIndex || 0) % waypoints.length];
        const wdx = targetWP.pos[0] - entity.pos[0];
        const wdz = targetWP.pos[2] - entity.pos[2];
        const wdSq = wdx*wdx + wdz*wdz;

        if (wdSq < 0.25) {
          entity.currentWaypointIndex = ((entity.currentWaypointIndex || 0) + 1) % waypoints.length;
          entity.isMoving = false;
        } else {
          entity.isMoving = true;
          entity.rot[1] = Math.atan2(wdx, wdz);
          await moveWithCollision(wdx, wdz, speed);
        }
        break;
      }
    }

    if (entity.pos[0] !== ox || entity.pos[2] !== oz || entity.pos[1] !== oy || entity.aiState !== oldAIState) {
      updateInGrid(entityGrid, entity.id, [ox, oy, oz], entity.pos);
      dirtyEntities.add(entity.id);
    }
  }
};
