/**
 * @file server/systems/ai.ts
 * @description Manages the artificial intelligence logic for all non-player entities.
 * Handles patrolling, aggro states, pathfinding, and combat decision-making.
 * @importance Essential: Drives the behavior of enemies and NPCs, making the game world feel alive and challenging.
 */
import { entities, worldObjects, dirtyEntities, terrainData, players } from "../state";
import { resolveWorldCollision, updateInGrid, entityGrid, objectGrid, getGroundHeight, isAnyPlayerNearby } from "./spatial";
import { ENTITY_TEMPLATES } from "../data/entityTemplates";
import { executeEntityAttack } from "../logic/combat";

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
export const updateEntityAI = async (tickTime: number, io: any) => {
  const dt = tickTime / 1000;
  aiTickCount++;

  let index = 0;
  for (const entity of entities.values()) {
    index++;
    if (entity.isDead) continue;
    
    // Fix existing NaN positions (from previous speed bug)
    if (isNaN(entity.pos[0]) || isNaN(entity.pos[1]) || isNaN(entity.pos[2])) {
      entity.pos = [...(entity.homePos || [0, 0, 0])];
      dirtyEntities.add(entity.id);
    }

    // --- LIVE PATCHING (Ensure existing entities get the update) ---
    if (entity.behaviorType === undefined && entity.type !== 'npc') {
      const template = ENTITY_TEMPLATES[entity.entityClass || ''] || ENTITY_TEMPLATES['slime'];
      entity.behaviorType = template.behaviorType || (template.type === 'enemy' ? 'aggressive' : 'neutral');
      entity.agroRange = entity.agroRange || template.aggroRadius || 15;
      entity.chaseDistance = entity.chaseDistance || template.leashRadius || 40;
      entity.moveSpeed = entity.moveSpeed || template.moveSpeed || 3;
      entity.minDamage = entity.minDamage || template.minDamage || 1;
      entity.maxDamage = entity.maxDamage || template.maxDamage || 2;
      entity.attackSpeed = entity.attackSpeed || template.attackSpeed || 2;
    }

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
    if (entity.type === 'npc' || entity.isSleeping) continue;

    const speed = (entity.moveSpeed || 3) * dt; 
    
    const moveWithCollision = async (dx: number, dz: number, s: number) => {
      const mag = Math.sqrt(dx*dx + dz*dz);
      if (mag < 0.01) return;
      const nx = (dx/mag) * s;
      const nz = (dz/mag) * s;
      
      if (isNaN(nx) || isNaN(nz)) return;
      
      const nextPos: [number, number, number] = [entity.pos[0] + nx, entity.pos[1], entity.pos[2] + nz];
      const resolved = await resolveWorldCollision(entity.pos, nextPos, 0.5);
      
      // Stuck Detection: If we didn't move much despite trying
      const moveDistSq = (resolved[0]-entity.pos[0])**2 + (resolved[2]-entity.pos[2])**2;
      if (moveDistSq < (s * 0.1)**2) {
        entity.stuckTicks = (entity.stuckTicks || 0) + 1;
      } else {
        entity.stuckTicks = 0;
      }
      
      entity.pos = resolved;
    };

    // --- AGGRO & TARGETING LOGIC (Interleaved) ---
    if (isAITick && !entity.isDead && entity.aiState !== 'RETURN') {
      const behavior = entity.behaviorType || 'neutral';
      
      // If aggressive, look for nearby players
      if (behavior === 'aggressive' && !entity.targetId) {
        const range = entity.agroRange || 15;
        const rangeSq = range * range;
        
        for (const player of players.values()) {
          const dx = player.pos[0] - entity.pos[0];
          const dz = player.pos[2] - entity.pos[2];
          if (dx*dx + dz*dz < rangeSq) {
            entity.targetId = player.id;
            entity.aiState = 'CHASE';
            break;
          }
        }
      }
      
      // Check if target is still valid/nearby
      if (entity.targetId) {
        const target = players.get(entity.targetId) || entities.get(entity.targetId);
        if (!target || target.hp! <= 0) {
          entity.targetId = null;
          entity.aiState = 'RETURN';
        } else {
          const dx = target.pos[0] - entity.pos[0];
          const dz = target.pos[2] - entity.pos[2];
          const distSq = dx*dx + dz*dz;
          const maxChase = entity.chaseDistance || 40;
          
          // Leashing logic: too far from home or target too far
          const hPos = entity.homePos || entity.pos;
          const hdx = hPos[0] - entity.pos[0];
          const hdz = hPos[2] - entity.pos[2];
          const homeDistSq = hdx*hdx + hdz*hdz;

          if (distSq > maxChase * maxChase || homeDistSq > (maxChase * 2.5)**2 || (entity.stuckTicks || 0) > 60) {
            entity.targetId = null;
            entity.aiState = 'RETURN';
          }
        }
      }
    }

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
        
        entity.isImmune = true; // Immune while returning
        entity.targetId = null;

        if (rdSq < 1.0) { 
          entity.aiState = entity.pathId ? 'PATROL' : 'IDLE';
          entity.isMoving = false;
          entity.isImmune = false;
          entity.hp = entity.maxHp; // Full heal upon return
          entity.stuckTicks = 0;
        } else {
          entity.isMoving = true;
          entity.rot[1] = Math.atan2(rdx, rdz);
          await moveWithCollision(rdx, rdz, speed * 1.5);
        }
        break;
      case 'CHASE': {
        if (!entity.targetId) {
          entity.aiState = 'RETURN';
          break;
        }
        const target = players.get(entity.targetId) || entities.get(entity.targetId);
        if (!target) break;

        const cdx = target.pos[0] - entity.pos[0];
        const cdz = target.pos[2] - entity.pos[2];
        const cdy = target.pos[1] - entity.pos[1];
        const cdSq = cdx*cdx + cdz*cdz;
        
        // Vertical check: If player is more than 3 units above/below and we are close horizontally
        if (Math.abs(cdy) > 3.0 && cdSq < 16) {
          entity.stuckTicks = (entity.stuckTicks || 0) + 1;
        }

        // Stop if close enough to attack (melee range ~2 units)
        if (cdSq < 4 && Math.abs(cdy) < 2.5) {
          entity.isMoving = false;
          entity.rot[1] = Math.atan2(cdx, cdz);
          
          // Attack Logic
          const now = Date.now();
          const attackInterval = (entity.attackSpeed || 2) * 1000;
          if (now - (entity.lastAttackTime || 0) > attackInterval) {
            executeEntityAttack(io, entity, target);
          }
        } else {
          entity.isMoving = true;
          entity.rot[1] = Math.atan2(cdx, cdz);
          await moveWithCollision(cdx, cdz, speed * 1.2);
        }
        break;
      }
      case 'FLEE': {
        if (!entity.targetId) {
          entity.aiState = 'RETURN';
          break;
        }
        const target = players.get(entity.targetId) || entities.get(entity.targetId);
        if (!target) break;

        const fdx = entity.pos[0] - target.pos[0];
        const fdz = entity.pos[2] - target.pos[2];
        
        entity.isMoving = true;
        entity.rot[1] = Math.atan2(fdx, fdz);
        await moveWithCollision(fdx, fdz, speed * 1.3);

        // Stop fleeing if far enough
        if (fdx*fdx + fdz*fdz > 25*25) {
          entity.targetId = null;
          entity.aiState = 'RETURN';
        }
        break;
      }
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
