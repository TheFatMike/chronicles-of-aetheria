/**
 * @file server/systems/ai.ts
 * @description Manages the artificial intelligence logic for all non-player entities.
 * Handles patrolling, aggro states, pathfinding, and combat decision-making.
 * @importance Essential: Drives the behavior of enemies and NPCs, making the game world feel alive and challenging.
 */
import { entities, worldObjects, dirtyEntities, terrainData } from "../state";
import { resolveWorldCollision, updateInGrid, entityGrid, objectGrid, getGroundHeight } from "./spatial";

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

export const updateEntityAI = async (tickTime: number) => {
  const GRAVITY = 20; // units per second squared
  const dt = tickTime / 1000;

  for (const entity of entities.values()) {
    if (entity.isDead) continue;
    
    const oldPos: [number, number, number] = [...entity.pos] as [number, number, number];
    const oldAIState = entity.aiState;

    // 1. Gravity & Ground Detection (Moving Entities Only)
    // We skip physics for NPCs to allow precise editor placement on complex surfaces like stairs.
    if (entity.type !== 'npc') {
      const currentGroundY = await getGroundHeight(entity.pos, terrainData);
      const GRAVITY = 20;
      const dt = tickTime / 1000;

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

    // 2. Horizontal Movement AI (Skip for NPCs)
    if (entity.type === 'npc') continue;

    const speed = entity.stats.moveSpeed * dt;
    
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
      case 'CHASE':
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
        if (!targetWP) {
          entity.currentWaypointIndex = 0;
          break;
        }

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

    if (entity.pos[0] !== oldPos[0] || entity.pos[2] !== oldPos[2] || entity.pos[1] !== oldPos[1] || entity.aiState !== oldAIState) {
      updateInGrid(entityGrid, entity.id, oldPos, entity.pos);
      dirtyEntities.add(entity.id);
    }
  }
};
