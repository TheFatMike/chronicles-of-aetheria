/**
 * @file server/systems/spawners.ts
 * @description Logic for entity lifecycle management via world spawners.
 * Automatically generates mobs and NPCs based on template definitions and spatial constraints.
 * @importance Essential: Populates the game world with interactable entities and maintains the ecosystem's balance.
 */
import { performance } from "perf_hooks";
import { entities, spawners, dirtyEntities, spawnerEntityCounts } from "../state";
import { ENTITY_TEMPLATES } from "../data/entityTemplates";
import crypto from "crypto";
import { createNPCEntity } from "../lib/entities";
import { updateInGrid, entityGrid } from "./spatial";
import { serverLogger } from "../logger";

export const registerSpawnerFromObject = (obj: any) => {
  const spawnerId = obj.id;
  const entityType = obj.type.replace('spawner_', ''); // e.g., 'spawner_slime' -> 'slime'
  
  if (!spawners.has(spawnerId)) {
    serverLogger.info("game", `Registering Spawner: ${entityType} at ${obj.pos}`);
  }

  spawners.set(spawnerId, {
    id: spawnerId,
    name: `${entityType} Spawner`,
    type: 'enemy',
    entityType,
    level: obj.level || 1,
    pos: obj.pos,
    spawnRadius: obj.spawnRadius || 10,
    maxEntities: obj.maxEntities || 3,
    respawnTime: obj.respawnTime || 10,
    lastSpawn: -9999999, // Force immediate spawn on first tick
  });
};

export const updateSpawners = (now: number) => {
  for (const spawner of spawners.values()) {
    const count = spawnerEntityCounts.get(spawner.id) || 0;
    const interval = spawner.spawnInterval || (spawner.respawnTime * 1000) || 10000;
    
    // Check if we need to spawn
    if (count < spawner.maxEntities && now - (spawner.lastSpawn || 0) > interval) {
      // INITIAL BURST: If this is a fresh spawner, spawn a full wave immediately!
      const isInitialBurst = (spawner.lastSpawn || 0) < 0;
      const numToSpawn = isInitialBurst ? (spawner.maxEntities - count) : 1;

      for (let i = 0; i < numToSpawn; i++) {
        const id = crypto.randomUUID();
        const radius = spawner.radius || spawner.spawnRadius || 5;
        const rx = (Math.random() - 0.5) * radius * 2;
        const rz = (Math.random() - 0.5) * radius * 2;
        
        const pos: [number, number, number] = [spawner.pos[0] + rx, 0, spawner.pos[2] + rz];
        const rot: [number, number, number] = [0, Math.random() * Math.PI * 2, 0];
        
        const newEntity = createNPCEntity(id, null, spawner.entityType, pos, rot);
        
        // Inject spawner-specific logic
        const entityWithSpawner = {
          ...newEntity,
          spawnerId: spawner.id,
          aiState: spawner.pathId ? 'PATROL' : 'IDLE',
          pathId: spawner.pathId,
          currentWaypointIndex: 0
        };

        // Register in systems
        entities.set(id, entityWithSpawner as any);
        updateInGrid(entityGrid, id, null, pos);
        dirtyEntities.add(id);
      }

      // Update the spawner's count and timestamp
      spawnerEntityCounts.set(spawner.id, count + numToSpawn);
      spawner.lastSpawn = now;
    }
  }
};

export const decrementSpawnerCount = (spawnerId?: string) => {
  if (!spawnerId) return;
  const spawner = spawners.get(spawnerId);
  if (spawner) {
    const count = spawnerEntityCounts.get(spawnerId) || 0;
    // If the spawner was full, start the timer from now so we wait the full interval
    if (count >= (spawner.maxEntities || 1)) {
      spawner.lastSpawn = performance.now();
    }
    
    if (count > 0) {
      spawnerEntityCounts.set(spawnerId, count - 1);
    }
  } else {
    // Fallback if spawner object not found
    const count = spawnerEntityCounts.get(spawnerId) || 0;
    if (count > 0) {
      spawnerEntityCounts.set(spawnerId, count - 1);
    }
  }
};
