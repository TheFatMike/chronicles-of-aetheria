import { db } from "../db";
import { players, worldObjects, spawners, entities } from "../state";
import { serverLogger } from "../logger";
import admin from "firebase-admin";

import { createNPCEntity } from "../lib/entities";

export const initializeWorld = async () => {
  try {
    // 1. Clear existing state to prevent duplicates on reload
    worldObjects.clear();
    entities.clear();
    spawners.clear();
    
    serverLogger.info("system", "Starting world initialization from Firestore...");
    
    // 2. Load from authoritative 'world' collection
    const snapshot = await db.collection("world").get();
    
    snapshot.forEach((doc: admin.firestore.QueryDocumentSnapshot) => {
      const data = doc.data();
      const id = doc.id;
      
      // 2. Load from authoritative 'world' collection
      const hitboxes = data.hitboxes || []; // Keep existing if any, but don't auto-generate
      const worldObj = { id, ...data, hitboxes };
      
      worldObjects.set(id, worldObj);

      // 3. Handle Special Types (NPCs & Spawners)
      if (data.type.startsWith("npc_")) {
        const entityId = `npc-${id}`;
        const npcEntity = createNPCEntity(entityId, id, data.type, data.pos, data.rot);
        entities.set(entityId, npcEntity as any);
      }
      
      if (data.type.startsWith("spawner_")) {
        const s = data.scale;
        const scaleX = Array.isArray(s) ? s[0] : (s?.x ?? 1);
        
        const spawnerData = {
          id,
          entityType: data.type.replace("spawner_", ""),
          pos: data.pos,
          radius: scaleX * 5,
          maxEntities: 3,
          spawnInterval: 10000,
          ...data
        };
        spawners.set(id, spawnerData);
      }
    });
    
    serverLogger.info("system", `LOAD COMPLETE: ${worldObjects.size} objects, ${entities.size} NPCs, ${spawners.size} spawners active.`);
  } catch (e: any) {
    serverLogger.error("system", "CRITICAL: World initialization failed", e.message);
  }
};

export const initializeSpawners = async () => {
  // Logic is now integrated into initializeWorld for consistency
  // but we keep the export to satisfy imports
  return;
};

export const autosavePlayers = async () => {
  if (players.size === 0) return;
  
  const batch = db.batch();
  let count = 0;
  
  for (const p of players.values()) {
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
    await batch.commit();
    serverLogger.info("firestore", `Autosave complete. ${count} players backed up.`);
  } catch (e: any) {
    serverLogger.error("firestore", "Autosave failed", e.message);
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
