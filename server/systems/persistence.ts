import admin from "firebase-admin";
import { db } from "../db";
import { serverLogger } from "../logger";
import { players, worldObjects, spawners, entities } from "../state";
import { INITIAL_WORLD_OBJECTS } from "../../src/data/world";
import { createNPCEntity } from "../lib/entities";

export const GET_HITBOXES = (type: string, scale: number = 1): any[] => {
  // We now use automatic Mesh Collision on the client. 
  // Manual hitboxes are deprecated.
  return [];
};

export const initializeWorld = async () => {
  try {
    const snapshot = await db.collection("world").get();
    if (snapshot.empty) {
      serverLogger.info("world", "No world objects in DB. Initializing default world...");
      const batch = db.batch();
      for (const obj of INITIAL_WORLD_OBJECTS) {
        const docRef = db.collection("world").doc(obj.id);
        batch.set(docRef, obj);
        worldObjects.set(obj.id, { ...obj, hitboxes: GET_HITBOXES(obj.type, obj.scale) });
      }
      await batch.commit();
    } else {
      serverLogger.info("world", `Loading ${snapshot.size} objects from DB...`);
      snapshot.forEach((doc: any) => {
        const data = doc.data() as any;
        worldObjects.set(doc.id, { 
          ...data, 
          hitboxes: GET_HITBOXES(data.type, data.scale) 
        });

        // AUTO-SPAWN: If this is an NPC or Spawner world object, register it!
        if (data.type.startsWith('spawner_')) {
          const entityType = data.type.replace('spawner_', '');
          spawners.set(doc.id, { 
            id: doc.id, 
            entityType,
            pos: data.pos,
            radius: 5,
            maxEntities: 3,
            spawnInterval: 10000 
          });
        } else if (data.type.startsWith('npc_')) {
          const npcEntity = createNPCEntity(doc.id, doc.id, data.type, data.pos, data.rot || [0,0,0]);
          entities.set(doc.id, npcEntity as any);
        }
      });
    }
  } catch (error: any) {
    serverLogger.error("world", `Failed to initialize world: ${error.message}`);
  }
};

export const initializeSpawners = async () => {
  try {
    const snapshot = await db.collection("spawners").get();
    snapshot.forEach((doc: any) => {
      spawners.set(doc.id, { id: doc.id, ...doc.data() } as any);
    });
    serverLogger.info("system", `Initialized ${spawners.size} spawners.`);
  } catch (error: any) {
    serverLogger.error("system", `Failed to initialize spawners: ${error.message}`);
  }
};

export const autosavePlayers = async () => {
  if (players.size === 0) return;
  const batch = db.batch();
  for (const p of players.values()) {
    const charRef = db.collection("users").doc(p.userId).collection("characters").doc(p.characterId);
    batch.set(charRef, {
      pos: p.pos, rot: p.rot, hp: p.hp, mp: p.mp,
      lastActive: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  }
  try {
    await batch.commit();
  } catch (e: any) {
    serverLogger.error("system", "Autosave failed", e.message);
  }
};

export const performShutdownSave = async () => {
  if (players.size === 0) return;
  
  const batch = db.batch();
  for (const p of players.values()) {
    const charRef = db.collection("users").doc(p.userId).collection("characters").doc(p.characterId);
    batch.set(charRef, { 
      pos: p.pos, 
      rot: p.rot,
      hp: p.hp,
      mp: p.mp,
      stats: p.stats,
      equipment: p.equipment,
      class: p.class,
      color: p.color,
      lastActive: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  }
  
  try {
    await batch.commit();
    serverLogger.info("system", `Successfully saved ${players.size} players during shutdown.`);
  } catch (e: any) {
    serverLogger.error("system", `Shutdown save failed: ${e.message}`);
  }
};
