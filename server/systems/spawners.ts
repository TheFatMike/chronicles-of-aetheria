import { entities, spawners, dirtyEntities } from "../state";
import { ENTITY_TEMPLATES } from "../data/entityTemplates";
import crypto from "crypto";
import { createNPCEntity } from "../lib/entities";
import { updateInGrid, entityGrid } from "./spatial";

export const updateSpawners = (now: number) => {
  for (const spawner of spawners.values()) {
    const activeEntities = Array.from(entities.values()).filter(e => e.spawnerId === spawner.id);
    if (activeEntities.length < spawner.maxEntities && now - (spawner.lastSpawn || 0) > spawner.spawnInterval) {
      const id = crypto.randomUUID();
      const template = ENTITY_TEMPLATES[spawner.entityType];
      if (!template) continue;

      const rx = (Math.random() - 0.5) * spawner.radius * 2;
      const rz = (Math.random() - 0.5) * spawner.radius * 2;
      
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
      
      spawner.lastSpawn = now;
    }
  }
};
