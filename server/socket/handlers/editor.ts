/**
 * @file server/socket/handlers/editor.ts
 * @description Handlers for the in-game world editor.
 * Manages object placement, environmental changes, and spawner configuration.
 * @importance Essential: Empowers creators to build and modify the game world dynamically.
 */
import { Socket, Server } from "socket.io";
import { z } from "zod";
import admin from "firebase-admin";
import { players, worldObjects, spawners, spawnerEntityCounts, entities, terrainData, ServerCharacter } from "../../state";
import { db } from "../../db";
import { serverLogger } from "../../logger";
import { loadTerrainRegion } from "../../systems/persistence";
import { createNPCEntity } from "../../lib/entities";
import { updateInGrid, objectGrid, entityGrid } from "../../systems/spatial";
import { clearAICache } from "../../systems/ai";
import { SaveWorldObjectSchema, BatchSaveSchema } from "../../lib/schemas";
import { validatePayload } from "../../lib/validation";

export const isEditorAuthorized = (socket: Socket, player: any): player is ServerCharacter => {
  const email = (socket as any).email;
  const ownerEmails = (process.env.OWNER_EMAILS || "").toLowerCase().split(",");
  const isOwnerEmail = email && ownerEmails.includes(email.toLowerCase());
  return !!player && (player.role === 'owner' || player.role === 'dev' || player.role === 'admin' || isOwnerEmail);
};

export const handleSaveWorldObject = async (io: Server, socket: Socket, data: any) => {
  const validated = validatePayload(socket, SaveWorldObjectSchema, data, "save_world_object");
  if (!validated) return;

  const player = players.get(socket.id);
  if (!isEditorAuthorized(socket, player)) return;

  const { id, type, pos, rot, scale, name, role, color } = validated;
  let { modelUrl } = validated;
  
  if (!modelUrl && type === 'tower_base') {
    modelUrl = '/assets/models/tower_base.glb';
  }

  const worldObj = { id, type, pos, rot, scale, modelUrl, name, role, color };

  try {
    // 1. Save to chunked storage
    const oldObj = worldObjects.get(id);
    const chunkX = Math.floor(pos[0] / 100);
    const chunkZ = Math.floor(pos[2] / 100);
    const chunkId = `chunk_${chunkX}_${chunkZ}`;
    
    // If object moved chunks, delete from old chunk
    if (oldObj?.pos) {
      const oldChunkX = Math.floor(oldObj.pos[0] / 100);
      const oldChunkZ = Math.floor(oldObj.pos[2] / 100);
      if (oldChunkX !== chunkX || oldChunkZ !== chunkZ) {
        const oldChunkId = `chunk_${oldChunkX}_${oldChunkZ}`;
        await db.collection("object_chunks").doc(oldChunkId).update({
          [`objects.${id}`]: admin.firestore.FieldValue.delete()
        }).catch(() => {});
      }
    }

    // Save to new/current chunk
    await db.collection("object_chunks").doc(chunkId).set({
      objects: { [id]: worldObj }
    }, { merge: true });
    
    // Update Spatial Grid
    updateInGrid(objectGrid, id, oldObj?.pos || null, pos);
    
    worldObjects.set(id, worldObj);
    
    // Invalidate AI cache if this might be a waypoint
    if (type === 'waypoint') clearAICache();

    if (type.startsWith("spawner_")) {
      const { registerSpawnerFromObject } = await import("../../systems/spawners");
      registerSpawnerFromObject(worldObj);
      io.emit("spawners_sync", Array.from(spawners.values()));
    }

    io.emit("world_object_updated", worldObj);
    serverLogger.info("world", `${player.name} updated ${type} (${id})`);

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
  const validated = validatePayload(socket, z.object({ id: z.string() }), data, "remove_world_object");
  if (!validated) return;

  const player = players.get(socket.id);
  if (!isEditorAuthorized(socket, player)) return;

  const { id } = validated;
  const existing = worldObjects.get(id);

  try {
    // Use the object's position to find the correct chunk, NOT the player's position
    const pos = existing?.pos;
    if (pos) {
      const chunkX = Math.floor(pos[0] / 100);
      const chunkZ = Math.floor(pos[2] / 100);
      const chunkId = `chunk_${chunkX}_${chunkZ}`;
      const path = `objects.${id}`;
      // Use update() to ensure the field is removed properly using dot notation
      await db.collection("object_chunks").doc(chunkId).update({
        [path]: admin.firestore.FieldValue.delete()
      }).catch((err: any) => {
        serverLogger.warn("world", `Could not remove ${id} from chunk ${chunkId}: ${err.message}`);
      });
    }
    
    // Cleanup Spatial Grid
    if (existing?.pos) {
      const key = Math.floor(existing.pos[0] / 50) + "," + Math.floor(existing.pos[2] / 50);
      objectGrid.get(key)?.delete(id);
    }
    
    worldObjects.delete(id);
    if (existing?.type === 'waypoint') clearAICache();

    if (existing?.type.startsWith("spawner_")) {
      // Spawners are automatically managed by chunks now. 
      // Deleting the world object is enough as long as we sync the client.
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
    serverLogger.info("world", `${player.name} removed world object ${id}`);
  } catch (e: any) {
    serverLogger.error("world", "Failed to remove world object", e.message);
  }
};

export const handleBatchSaveWorldObjects = async (io: Server, socket: Socket, data: { saves: any[], deletes: string[], terrain?: any[] }) => {
  const validated = validatePayload(socket, BatchSaveSchema, data, "batch_save_world_objects");
  if (!validated) return;

  const player = players.get(socket.id);
  if (!isEditorAuthorized(socket, player)) return;

  const { saves = [], deletes = [], terrain = [] } = validated;
  serverLogger.info("world", `Batch save request: ${saves.length} saves, ${deletes.length} deletes, ${terrain.length} terrain pts from ${player.name}`);
  
  // 1. Safety Limit: Prevent massive DoS-style payloads
  const totalOps = saves.length + deletes.length + terrain.length;
  if (totalOps > 5000) {
    serverLogger.warn("world", `Rejected oversized batch from ${player.name} (${totalOps} ops)`);
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
      const { OBJECT_TEMPLATES } = await import("../../../shared/data/world/templates");

      for (const op of chunk) {
        if (op.type === 'delete') {
          const id = op.id;
          const existing = worldObjects.get(id);
          const pos = op.pos || existing?.pos;
          
          if (pos) {
            const chunkX = Math.floor(pos[0] / 100);
            const chunkZ = Math.floor(pos[2] / 100);
            const chunkId = `chunk_${chunkX}_${chunkZ}`;
            
            if (!objectsByChunk.has(chunkId)) objectsByChunk.set(chunkId, { objects: {} });
            const chunkData = objectsByChunk.get(chunkId)!;
            // Nested object format works with batch.set(..., { merge: true })
            chunkData.objects[id] = admin.firestore.FieldValue.delete();

            const gridKey = Math.floor(pos[0] / 50) + "," + Math.floor(pos[2] / 50);
            objectGrid.get(gridKey)?.delete(id);
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

          // CHUNK MIGRATION: If object moved chunks, delete from old chunk record
          if (existing?.pos) {
            const oldChunkX = Math.floor(existing.pos[0] / 100);
            const oldChunkZ = Math.floor(existing.pos[2] / 100);
            if (oldChunkX !== chunkX || oldChunkZ !== chunkZ) {
              const oldChunkId = `chunk_${oldChunkX}_${oldChunkZ}`;
              if (!objectsByChunk.has(oldChunkId)) objectsByChunk.set(oldChunkId, { objects: {} });
              objectsByChunk.get(oldChunkId)!.objects[d.id] = admin.firestore.FieldValue.delete();
            }
          }

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

          if (!terrainByChunk.has(chunkId)) terrainByChunk.set(chunkId, {});
          const chunkPoints = terrainByChunk.get(chunkId)!;
          const ix = Math.round(Number(p.x));
          const iz = Math.round(Number(p.z));
          const key = `${ix}_${iz}`;
          
          // DELTA COMPRESSION: If point is default (flat grass), delete it to save space
          if (Number(p.y) === 0 && (p.type === 'grass' || !p.type)) {
            chunkPoints[key] = admin.firestore.FieldValue.delete();
            terrainData.delete(key);
          } else {
            chunkPoints[key] = {
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
      for (const [chunkId, chunkData] of objectsByChunk.entries()) {
        const docRef = db.collection("object_chunks").doc(chunkId);
        batch.set(docRef, chunkData, { merge: true });
        
        const { redis } = await import("../../redis");
        if (redis.status === 'ready') await redis.sadd("world:existing_chunks", chunkId);
      }

      await batch.commit();
      serverLogger.info("firestore", `Committed batch chunk of ${chunk.length} operations.`);
    }

    // 3. Post-save Sync
    if (saves.some(s => s.type?.startsWith("spawner_")) || deletes.some(d => worldObjects.get(d.id)?.type.startsWith("spawner_"))) {
      // Re-register all local spawners in modified chunks if needed, or just sync
      io.emit("spawners_sync", Array.from(spawners.values()));
    }

    if (deletes.length > 0) deletes.forEach(d => io.emit("world_object_removed", { id: d.id }));
    if (saves.length > 0) {
      saves.forEach(obj => {
        const saved = worldObjects.get(obj.id);
        if (saved) {
          io.emit("world_object_updated", saved);
        }
      });
    }
    
    if (terrain.length > 0) {
      io.emit("terrain_sync", terrain);
      try {
        const { redis, saveTerrainRedis } = await import("../../redis");
        const sanitizedTerrain = terrain.map(p => ({
          x: p.x,
          z: p.z,
          y: p.y,
          type: p.type || 'grass'
        }));
        await saveTerrainRedis(sanitizedTerrain); // Authoritative cache update
        if (redis.status === 'ready') {
          await redis.publish("terrain:sync", JSON.stringify(terrain));
        }
      } catch (re) {
        serverLogger.warn("redis", "Redis sync skipped during batch save (not connected)");
      }
    }

    socket.emit("world_save_status", { success: true, count: totalOps });
    serverLogger.info("world", `[SUCCESS] ${player.name} batch saved ${totalOps} changes.`);
  } catch (e: any) {
    serverLogger.error("world", `[CRITICAL FAILURE] Batch save failed for ${player.name}: ${e.message}`);
    socket.emit("world_save_status", { success: false, error: e.message });
  }
};

export const handleSpawnerReload = async (io: Server, socket: Socket) => {
  const player = players.get(socket.id);
  if (!isEditorAuthorized(socket, player)) return;
  
  spawners.clear();
  spawnerEntityCounts.clear();
  for (const [eid, ent] of entities.entries()) {
    if (ent.spawnerId) {
      if (ent.pos) {
        const key = Math.floor(ent.pos[0] / 50) + "," + Math.floor(ent.pos[2] / 50);
        entityGrid.get(key)?.delete(eid);
      }
      entities.delete(eid);
    }
  }
  
  // Force reload current player region to repopulate spawners
  if (player?.pos) {
    const { loadTerrainRegion } = await import("../../systems/persistence");
    await loadTerrainRegion(player.pos[0], player.pos[2]);
  }

  io.emit("spawners_sync", Array.from(spawners.values()));
  socket.emit("chat_message", {
    id: "sys-" + Date.now(),
    sender: "System",
    text: "Spawners cleared and local region re-synced.",
    timestamp: Date.now(),
    color: "#f59e0b"
  });
};
