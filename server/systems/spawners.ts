import { performance } from "perf_hooks";
import { entities, spawners, dirtyEntities, spawnerEntityCounts } from "../state";
import { ENTITY_TEMPLATES } from "../data/entityTemplates";
import crypto from "crypto";
import { createNPCEntity } from "../lib/entities";
import { updateInGrid, entityGrid } from "./spatial";

export const updateSpawners = (now: number) => {
  for (const spawner of spawners.values()) {
    const count = spawnerEntityCounts.get(spawner.id) || 0;
    const interval = spawner.spawnInterval || (spawner.respawnTime * 1000) || 10000;
    
    if (count < spawner.maxEntities && now - (spawner.lastSpawn || 0) > interval) {
      const id = crypto.randomUUID();
      const template = ENTITY_TEMPLATES[spawner.entityType];
      if (!template) continue;

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
      spawnerEntityCounts.set(spawner.id, count + 1);
      updateInGrid(entityGrid, id, null, pos);
      dirtyEntities.add(id);
      
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
