/**
 * @file server/socket/handlers/editor.ts
 * @description Handlers for the in-game world editor.
 * Manages object placement, environmental changes, and spawner configuration.
 * @importance Essential: Empowers creators to build and modify the game world dynamically.
 */
import { Socket, Server } from "socket.io";
import { players, worldObjects, spawners, entities, terrainData } from "../../state";
import { db } from "../../db";
import { serverLogger } from "../../logger";
import { initializeSpawners } from "../../systems/persistence";
import { createNPCEntity } from "../../lib/entities";
import { updateInGrid, objectGrid, entityGrid } from "../../systems/spatial";
import { clearAICache } from "../../systems/ai";

export const handleSaveWorldObject = async (io: Server, socket: Socket, data: any) => {
  const player = players.get(socket.id);
  if (!player || !["dev", "admin"].includes(player.role)) return;

  const { id, type, pos, rot, scale } = data;
  let { modelUrl } = data;
  
  if (!modelUrl && type === 'tower_base') {
    modelUrl = '/assets/models/tower_base.glb';
  }

  const worldObj = { id, type, pos, rot, scale, modelUrl };

  try {
    await db.collection("world").doc(id).set(worldObj, { merge: true });
    
    // Update Spatial Grid
    const oldObj = worldObjects.get(id);
    updateInGrid(objectGrid, id, oldObj?.pos || null, pos);
    
    worldObjects.set(id, worldObj);
    
    // Invalidate AI cache if this might be a waypoint
    if (type === 'waypoint') clearAICache();

    if (type.startsWith("spawner_")) {
      await initializeSpawners();
      io.emit("spawners_sync", Array.from(spawners.values()));
    }

    if (type.startsWith("npc_")) {
      const entityId = `npc-${id}`;
      const npcEntity = createNPCEntity(entityId, id, type, pos, rot);
      
      const oldNPC = entities.get(entityId);
      updateInGrid(entityGrid, entityId, oldNPC?.pos || null, pos);
      
      entities.set(entityId, npcEntity as any);
      io.emit("entity_spawn", npcEntity);
    }

    io.emit("world_object_updated", worldObj);
    serverLogger.info("world", `${player.characterName} updated ${type} (${id})`);

    socket.emit("chat_message", {
      id: "sys-" + Date.now(),
      sender: "WORLD",
      text: `Successfully placed/updated ${type}`,
      timestamp: Date.now(),
      color: "#10b981"
    });
  } catch (e: any) {
    serverLogger.error("world", "Failed to save world object", e.message);
  }
};

export const handleRemoveWorldObject = async (io: Server, socket: Socket, data: any) => {
  const player = players.get(socket.id);
  if (!player || !["dev", "admin"].includes(player.role)) return;

  const { id } = data;
  const existing = worldObjects.get(id);

  try {
    await db.collection("world").doc(id).delete();
    
    // Cleanup Spatial Grid
    if (existing?.pos) {
      const key = Math.floor(existing.pos[0] / 50) + "," + Math.floor(existing.pos[2] / 50);
      objectGrid.get(key)?.delete(id);
    }
    
    worldObjects.delete(id);
    if (existing?.type === 'waypoint') clearAICache();

    if (existing?.type.startsWith("spawner_")) {
      await initializeSpawners();
      io.emit("spawners_sync", Array.from(spawners.values()));
    } else if (existing?.type.startsWith("npc_")) {
      const entityId = `npc-${id}`;
      const existingNPC = entities.get(entityId);
      if (existingNPC) {
        if (existingNPC.pos) {
          const key = Math.floor(existingNPC.pos[0] / 50) + "," + Math.floor(existingNPC.pos[2] / 50);
          entityGrid.get(key)?.delete(entityId);
        }
        entities.delete(entityId);
        io.emit("entity_despawn", entityId);
      }
    }

    io.emit("world_object_removed", { id });
    serverLogger.info("world", `${player.characterName} removed world object ${id}`);
  } catch (e: any) {
    serverLogger.error("world", "Failed to remove world object", e.message);
  }
};

export const handleBatchSaveWorldObjects = async (io: Server, socket: Socket, data: { saves: any[], deletes: string[], terrain?: any[] }) => {
  const player = players.get(socket.id);
  if (!player || !["dev", "admin"].includes(player.role)) return;

  const { saves = [], deletes = [], terrain = [] } = data;
  
  // 1. Safety Limit: Prevent massive DoS-style payloads
  const totalOps = saves.length + deletes.length + terrain.length;
  if (totalOps > 2000) {
    serverLogger.warn("world", `Rejected oversized batch from ${player.characterName} (${totalOps} ops)`);
    return;
  }

  try {
    // Define explicit types for the operations to help TypeScript narrow them correctly
    type EditorOp = 
      | { type: 'delete', id: string }
      | { type: 'save', data: any }
      | { type: 'terrain', data: any };

    const allOperations: EditorOp[] = [
      ...deletes.map(id => ({ type: 'delete', id } as const)),
      ...saves.map(obj => ({ type: 'save', data: obj } as const)),
      ...terrain.map(p => ({ type: 'terrain', data: p } as const))
    ];

    for (let i = 0; i < allOperations.length; i += 450) {
      const batch = db.batch();
      const chunk = allOperations.slice(i, i + 450);

      for (const op of chunk) {
        if (op.type === 'delete') {
          const id = op.id;
          const existing = worldObjects.get(id);
          batch.delete(db.collection("world").doc(id));
          
          if (existing?.pos) {
            const key = Math.floor(existing.pos[0] / 50) + "," + Math.floor(existing.pos[2] / 50);
            objectGrid.get(key)?.delete(id);
          }

          // Handle Entity Despawn for NPCs/Spawners
          if (existing?.type.startsWith("npc_") || existing?.type.startsWith("spawner_")) {
            const entityId = `npc-${id}`;
            const existingNPC = entities.get(entityId);
            if (existingNPC) {
              if (existingNPC.pos) {
                const eKey = Math.floor(existingNPC.pos[0] / 50) + "," + Math.floor(existingNPC.pos[2] / 50);
                entityGrid.get(eKey)?.delete(entityId);
              }
              entities.delete(entityId);
              io.emit("entity_despawn", entityId);
            }
          }

          worldObjects.delete(id);
          if (existing?.type === 'waypoint') clearAICache();
        } 
        else if (op.type === 'save') {
          const d = op.data;
          const existing = worldObjects.get(d.id);
          
          // 2. Data Sanitization: Only pick allowed fields
          const worldObj = {
            id: d.id,
            type: d.type || existing?.type,
            pos: d.pos || existing?.pos,
            rot: d.rot || existing?.rot,
            scale: d.scale ?? existing?.scale,
            modelUrl: d.modelUrl ?? existing?.modelUrl,
            entityClass: d.entityClass ?? existing?.entityClass,
            level: d.level ?? existing?.level,
            spawnRadius: d.spawnRadius ?? existing?.spawnRadius,
            maxEntities: d.maxEntities ?? existing?.maxEntities,
            respawnTime: d.respawnTime ?? existing?.respawnTime,
            pathId: d.pathId ?? existing?.pathId,
            waypointId: d.waypointId ?? existing?.waypointId,
            nextWaypointId: d.nextWaypointId ?? existing?.nextWaypointId
          };

          batch.set(db.collection("world").doc(d.id), worldObj, { merge: true });
          updateInGrid(objectGrid, d.id, existing?.pos || null, worldObj.pos);
          worldObjects.set(d.id, worldObj);
          if (worldObj.type === 'waypoint') clearAICache();
        }
        else if (op.type === 'terrain') {
          const p = op.data;
          const key = `${p.x}_${p.z}`;
          const chunkX = Math.floor(Number(p.x) / 100);
          const chunkZ = Math.floor(Number(p.z) / 100);
          const chunkId = `chunk_${chunkX}_${chunkZ}`;

          // Ensure we only save sanitized terrain data with the required chunkId for lazy loading
          batch.set(db.collection("terrain").doc(key), { 
            x: Number(p.x), 
            z: Number(p.z), 
            chunkId,
            y: Number(p.y), 
            type: String(p.type) 
          }, { merge: true });
          
          terrainData.set(key, { y: p.y, type: p.type });
        }
      }

      await batch.commit();
    }

    // 3. Post-save Sync
    if (saves.some(s => s.type?.startsWith("spawner_")) || deletes.some(id => worldObjects.get(id)?.type.startsWith("spawner_"))) {
      await initializeSpawners();
      io.emit("spawners_sync", Array.from(spawners.values()));
    }

    if (deletes.length > 0) deletes.forEach(id => io.emit("world_object_removed", { id }));
    if (saves.length > 0) saves.forEach(obj => io.emit("world_object_updated", worldObjects.get(obj.id)));
    if (terrain.length > 0) {
      io.emit("terrain_sync", terrain);
      const { redis } = await import("../../redis");
      redis.publish("terrain:sync", JSON.stringify(terrain));
    }

    serverLogger.info("world", `${player.characterName} batch saved ${totalOps} changes.`);
  } catch (e: any) {
    serverLogger.error("world", "Failed to batch save", e.message);
  }
};

export const handleSpawnerReload = async (io: Server, socket: Socket) => {
  const player = players.get(socket.id);
  if (!player || !["dev", "admin"].includes(player.role)) return;
  
  spawners.clear();
  for (const [eid, ent] of entities.entries()) {
    if (ent.spawnerId) entities.delete(eid);
  }
  
  await initializeSpawners();
  io.emit("spawners_sync", Array.from(spawners.values()));
  socket.emit("chat_message", {
    id: "sys-" + Date.now(),
    sender: "System",
    text: "Spawners reloaded from database.",
    timestamp: Date.now(),
    color: "#f59e0b"
  });
};
