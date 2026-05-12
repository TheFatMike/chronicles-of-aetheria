/**
 * @file server/socket/handlers/editor.ts
 * @description Handlers for the in-game world editor.
 * Manages object placement, environmental changes, and spawner configuration.
 * @importance Essential: Empowers creators to build and modify the game world dynamically.
 */
import { Socket, Server } from "socket.io";
import admin from "firebase-admin";
import { players, worldObjects, spawners, entities, terrainData } from "../../state";
import { db } from "../../db";
import { serverLogger } from "../../logger";
import { initializeSpawners } from "../../systems/persistence";
import { createNPCEntity } from "../../lib/entities";
import { updateInGrid, objectGrid, entityGrid } from "../../systems/spatial";
import { clearAICache } from "../../systems/ai";

export const handleSaveWorldObject = async (io: Server, socket: Socket, data: any) => {
  const player = players.get(socket.id);
  const email = (socket as any).email;
  const isAdminEmail = email?.toLowerCase() === "michaeljhoward94@gmail.com";
  if (!player || (player.role !== 'dev' && !isAdminEmail)) return;

  const { id, type, pos, rot, scale, name, role, color } = data;
  let { modelUrl } = data;
  
  if (!modelUrl && type === 'tower_base') {
    modelUrl = '/assets/models/tower_base.glb';
  }

  const worldObj = { id, type, pos, rot, scale, modelUrl, name, role, color };

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
      const npcEntity = createNPCEntity(entityId, id, type, pos, rot, worldObj);
      
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
  const email = (socket as any).email;
  const isAdminEmail = email?.toLowerCase() === "michaeljhoward94@gmail.com";
  if (!player || (player.role !== 'dev' && !isAdminEmail)) return;

  const { id } = data;
  const existing = worldObjects.get(id);

  try {
    // Aggressive cleanup: Try to delete from both legacy global and new chunked system
    await db.collection("world").doc(id).delete();
    
    if (player.pos) {
      const chunkX = Math.floor(player.pos[0] / 100);
      const chunkZ = Math.floor(player.pos[2] / 100);
      const chunkId = `chunk_${chunkX}_${chunkZ}`;
      const path = `objects.${id}`;
      await db.collection("object_chunks").doc(chunkId).update({
        [path]: admin.firestore.FieldValue.delete()
      }).catch(() => {}); // Ignore if chunk doc doesn't exist
    }
    
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
  const email = (socket as any).email;
  const isAdminEmail = email?.toLowerCase() === "michaeljhoward94@gmail.com";
  if (!player || (player.role !== 'dev' && !isAdminEmail)) return;

  const { saves = [], deletes = [], terrain = [] } = data;
  serverLogger.info("world", `Batch save request: ${saves.length} saves, ${deletes.length} deletes, ${terrain.length} terrain pts from ${player.characterName}`);
  
  // 1. Safety Limit: Prevent massive DoS-style payloads
  const totalOps = saves.length + deletes.length + terrain.length;
  if (totalOps > 5000) {
    serverLogger.warn("world", `Rejected oversized batch from ${player.characterName} (${totalOps} ops)`);
    return;
  }

  try {
    // Define explicit types for the operations to help TypeScript narrow them correctly
    type EditorOp = 
      | { type: 'delete', id: string, pos?: [number, number, number] }
      | { type: 'save', data: any }
      | { type: 'terrain', data: any };

    const allOperations: EditorOp[] = [
      ...deletes.map((d: any) => ({ type: 'delete', ...d } as const)),
      ...saves.map(obj => ({ type: 'save', data: obj } as const)),
      ...terrain.map(p => ({ type: 'terrain', data: p } as const))
    ];

    for (let i = 0; i < allOperations.length; i += 450) {
      const batch = db.batch();
      const chunk = allOperations.slice(i, i + 450);

      // 2. Process all operations in this chunk
      const terrainByChunk = new Map<string, Record<string, any>>();
      const objectsByChunk = new Map<string, Record<string, any>>();
      const { OBJECT_TEMPLATES } = await import("../../../src/data/world/templates");

      for (const op of chunk) {
        if (op.type === 'delete') {
          const id = op.id;
          const existing = worldObjects.get(id);
          const pos = op.pos || existing?.pos;
          
          if (pos) {
            const chunkX = Math.floor(pos[0] / 100);
            const chunkZ = Math.floor(pos[2] / 100);
            const chunkId = `chunk_${chunkX}_${chunkZ}`;
            
            if (!objectsByChunk.has(chunkId)) objectsByChunk.set(chunkId, {});
            const path = `objects.${id}`;
            (objectsByChunk.get(chunkId)! as any)[path] = admin.firestore.FieldValue.delete();

            const gridKey = Math.floor(pos[0] / 50) + "," + Math.floor(pos[2] / 50);
            objectGrid.get(gridKey)?.delete(id);

            // ALSO delete from legacy global collection if it exists there
            batch.delete(db.collection("world").doc(id));
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
          const type = d.type || existing?.type;
          const template = OBJECT_TEMPLATES[type];
          
          const worldObj: any = {
            id: d.id,
            type: type,
            pos: d.pos || existing?.pos,
            rot: d.rot || existing?.rot,
          };

          // Template Inheritance: Only save fields that differ from the template
          if (d.scale !== undefined && d.scale !== template?.scale) worldObj.scale = d.scale;
          if (d.modelUrl !== undefined && d.modelUrl !== template?.modelUrl) worldObj.modelUrl = d.modelUrl;
          
          // Carry over specific spawner/npc fields if they exist
          if (d.name) worldObj.name = d.name;
          if (d.role) worldObj.role = d.role;
          if (d.color) worldObj.color = d.color;
          if (d.entityClass) worldObj.entityClass = d.entityClass;
          if (d.level) worldObj.level = d.level;
          if (d.spawnRadius) worldObj.spawnRadius = d.spawnRadius;
          if (d.maxEntities) worldObj.maxEntities = d.maxEntities;
          if (d.respawnTime) worldObj.respawnTime = d.respawnTime;

          const chunkX = Math.floor(worldObj.pos[0] / 100);
          const chunkZ = Math.floor(worldObj.pos[2] / 100);
          const chunkId = `chunk_${chunkX}_${chunkZ}`;

          if (!objectsByChunk.has(chunkId)) objectsByChunk.set(chunkId, { objects: {} });
          const chunkData = objectsByChunk.get(chunkId)!;
          chunkData.objects[d.id] = worldObj;

          updateInGrid(objectGrid, d.id, existing?.pos || null, worldObj.pos);
          worldObjects.set(d.id, { ...template, ...existing, ...worldObj });
          if (worldObj.type === 'waypoint') clearAICache();
        }
        else if (op.type === 'terrain') {
          const p = op.data;
          const chunkX = Math.floor(Number(p.x) / 100);
          const chunkZ = Math.floor(Number(p.z) / 100);
          const chunkId = `chunk_${chunkX}_${chunkZ}`;

          if (!terrainByChunk.has(chunkId)) terrainByChunk.set(chunkId, { data: {} });
          const chunkData = terrainByChunk.get(chunkId)!;
          const key = `${p.x}_${p.z}`;
          
          // DELTA COMPRESSION: If point is default (flat grass), delete it to save space
          if (Number(p.y) === 0 && (p.type === 'grass' || !p.type)) {
            // We still use dot notation for deletes because we use merge:true on the whole doc
            const path = `data.${key}`;
            (chunkData.data as any)[path] = admin.firestore.FieldValue.delete();
            terrainData.delete(key);
          } else {
            chunkData.data[key] = {
              y: Number(p.y), 
              type: String(p.type || 'grass')
            };
            terrainData.set(key, { y: p.y, type: p.type || 'grass' });
          }
        }
      }

      // Add terrain chunk updates to the batch using a single-pass deep merge (1 write per chunk)
      for (const [chunkId, chunkPoints] of terrainByChunk.entries()) {
        const docRef = db.collection("terrain_chunks").doc(chunkId);
        // Using FieldPath keys with merge:true performs a deep-merge in a single write
        batch.set(docRef, { data: chunkPoints }, { merge: true });
        
        const { redis } = await import("../../redis");
        if (redis.status === 'ready') await redis.sadd("world:existing_chunks", chunkId);
      }

      // Add object chunk updates to the batch (1 write per chunk)
      for (const [chunkId, chunkObjs] of objectsByChunk.entries()) {
        const docRef = db.collection("object_chunks").doc(chunkId);
        batch.set(docRef, chunkObjs, { merge: true });
        
        const { redis } = await import("../../redis");
        if (redis.status === 'ready') await redis.sadd("world:existing_chunks", chunkId);
      }

      await batch.commit();
      serverLogger.info("firestore", `Committed batch chunk of ${chunk.length} operations.`);
    }

    // 3. Post-save Sync
    if (saves.some(s => s.type?.startsWith("spawner_")) || deletes.some(id => worldObjects.get(id)?.type.startsWith("spawner_"))) {
      await initializeSpawners();
      io.emit("spawners_sync", Array.from(spawners.values()));
    }

    if (deletes.length > 0) deletes.forEach(id => io.emit("world_object_removed", { id }));
    if (saves.length > 0) {
      saves.forEach(obj => {
        const saved = worldObjects.get(obj.id);
        if (saved) {
          io.emit("world_object_updated", saved);
          
          // NPC Auto-Spawn: If we just saved a new NPC, wake them up!
          if (saved.type.startsWith("npc_")) {
            const entityId = `npc-${saved.id}`;
            if (!entities.has(entityId)) {
              const npcEntity = createNPCEntity(entityId, saved.id, saved.type, saved.pos, saved.rot, saved);
              entities.set(entityId, npcEntity as any);
              updateInGrid(entityGrid, entityId, null, saved.pos);
              io.emit("entity_spawn", npcEntity);
            }
          }
        }
      });
    }
    
    if (terrain.length > 0) {
      io.emit("terrain_sync", terrain);
      try {
        const { redis, saveTerrainRedis } = await import("../../redis");
        await saveTerrainRedis(terrain); // Authoritative cache update
        if (redis.status === 'ready') {
          await redis.publish("terrain:sync", JSON.stringify(terrain));
        }
      } catch (re) {
        serverLogger.warn("redis", "Redis sync skipped during batch save (not connected)");
      }
    }

    socket.emit("world_save_status", { success: true, count: totalOps });
    serverLogger.info("world", `[SUCCESS] ${player.characterName} batch saved ${totalOps} changes.`);
  } catch (e: any) {
    serverLogger.error("world", `[CRITICAL FAILURE] Batch save failed for ${player.characterName}: ${e.message}`);
    socket.emit("world_save_status", { success: false, error: e.message });
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
