import { db } from "../db";
import { players, worldObjects, spawners, entities, terrainData } from "../state";
import { serverLogger } from "../logger";
import admin from "firebase-admin";

import { createNPCEntity } from "../lib/entities";
import { updateInGrid, objectGrid, entityGrid } from "./spatial";

export const initializeWorld = async () => {
  try {
    // 1. Clear existing state to prevent duplicates on reload
    worldObjects.clear();
    entities.clear();
    spawners.clear();
    objectGrid.clear();
    entityGrid.clear();
    
    serverLogger.info("system", "Starting world initialization from Firestore...");
    
    // 2. Load from authoritative 'world' collection
    const snapshot = await db.collection("world").get();
    
    snapshot.forEach((doc: admin.firestore.QueryDocumentSnapshot) => {
      const data = doc.data();
      const id = doc.id;
      
      // 2. Load from authoritative 'world' collection
      const worldObj = { id, ...data };
      
      worldObjects.set(id, worldObj);
      updateInGrid(objectGrid, id, null, data.pos);

      // 3. Handle Special Types (NPCs & Spawners)
      if (data.type.startsWith("npc_")) {
        const entityId = `npc-${id}`;
        const npcEntity = createNPCEntity(entityId, id, data.type, data.pos, data.rot);
        entities.set(entityId, npcEntity as any);
        updateInGrid(entityGrid, entityId, null, data.pos);
      }
    });

    // 4. Load Spawners & Terrain
    await initializeSpawners();
    await initializeTerrain();
    
    serverLogger.info("system", `LOAD COMPLETE: ${worldObjects.size} objects, ${entities.size} NPCs, ${spawners.size} spawners, ${terrainData.size} terrain tiles active.`);
  } catch (e: any) {
    serverLogger.error("system", "CRITICAL: World initialization failed", e.message);
  }
};

export const initializeTerrain = async () => {
  try {
    serverLogger.info("system", "Loading terrain data from Firestore...");
    const snapshot = await db.collection("terrain").get();
    
    snapshot.forEach((doc: any) => {
      const data = doc.data();
      if (!isNaN(data.y)) {
        terrainData.set(doc.id, { y: data.y, type: data.type || 'grass' });
      }
    });
    serverLogger.info("system", `Loaded ${terrainData.size} terrain modifications.`);
  } catch (e: any) {
    serverLogger.error("system", "Failed to load terrain", e.message);
  }
};

export const initializeSpawners = async () => {
  try {
    serverLogger.info("system", "Loading spawners from Firestore...");
    const snapshot = await db.collection("world").where("type", ">=", "spawner_").where("type", "<=", "spawner_\uf8ff").get();
    
    snapshot.forEach((doc: admin.firestore.QueryDocumentSnapshot) => {
      const data = doc.data();
      const id = doc.id;
      const s = data.scale;
      const scaleX = Array.isArray(s) ? s[0] : (s?.x ?? 1);
      
      const spawnerData = {
        id,
        entityType: data.type.replace("spawner_", ""),
        pos: data.pos,
        spawnRadius: scaleX * 5,
        maxEntities: 3,
        respawnTime: 10, // seconds
        ...data
      };
      spawners.set(id, spawnerData);
    });
  } catch (e: any) {
    serverLogger.error("system", "Failed to load spawners", e.message);
  }
};

export const autosavePlayers = async () => {
  if (players.size === 0) return;
  
  const playerArray = Array.from(players.values());
  const CHUNK_SIZE = 450; // Keep a buffer below the 500 limit
  
  for (let i = 0; i < playerArray.length; i += CHUNK_SIZE) {
    const chunk = playerArray.slice(i, i + CHUNK_SIZE);
    const batch = db.batch();
    let count = 0;

    for (const p of chunk) {
      if (!p.userId || !p.characterId) continue;
      const charRef = db.collection("users").doc(p.userId).collection("characters").doc(p.characterId);
      batch.set(charRef, {
        pos: p.pos,
        rot: p.rot,
        hp: p.hp,
        mp: p.mp,
        stats: p.stats,
        equipment: p.equipment,
        inventory: p.inventory,
        hotbar: p.hotbar,
        gold: p.gold || 0,
        level: p.level || 1,
        exp: p.exp || 0,
        maxExp: p.maxExp || 100,
        lastActive: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      count++;
    }

    try {
      if (count > 0) {
        await batch.commit();
        serverLogger.info("firestore", `Autosave chunk complete. ${count} players backed up.`);
      }
    } catch (e: any) {
      serverLogger.error("firestore", "Autosave chunk failed", e.message);
    }
  }
};


export const performShutdownSave = async () => {
  serverLogger.info("system", "Performing final shutdown save...");
  await autosavePlayers();
};

// Periodic save wrapper to maintain the interval if needed
export const startPeriodicSave = () => {
  setInterval(async () => {
    await autosavePlayers();
  }, 1000 * 60 * 5); // 5 minutes
};
