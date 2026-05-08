import { Socket, Server } from "socket.io";
import { players, worldObjects, spawners, entities } from "../../state";
import { db } from "../../db";
import { serverLogger } from "../../logger";
import { initializeSpawners } from "../../systems/persistence";
import { createNPCEntity } from "../../lib/entities";

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
    worldObjects.set(id, worldObj);

    if (type.startsWith("spawner_")) {
      await initializeSpawners();
      io.emit("spawners_sync", Array.from(spawners.values()));
    }

    if (type.startsWith("npc_")) {
      const entityId = `npc-${id}`;
      const npcEntity = createNPCEntity(entityId, id, type, pos, rot);
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
    worldObjects.delete(id);

    if (existing?.type.startsWith("spawner_")) {
      await initializeSpawners();
      io.emit("spawners_sync", Array.from(spawners.values()));
    } else if (existing?.type.startsWith("npc_")) {
      const entityId = `npc-${id}`;
      if (entities.has(entityId)) {
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
