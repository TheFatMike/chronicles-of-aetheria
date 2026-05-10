/**
 * @file server/socket/handlers/editor.ts
 * @description Handlers for the in-game world editor.
 * Manages object placement, environmental changes, and spawner configuration.
 * @importance Essential: Empowers creators to build and modify the game world dynamically.
 */
import { Socket, Server } from "socket.io";
import { players, worldObjects, spawners, entities } from "../../state";
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
