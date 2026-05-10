/**
 * @file server/systems/persistence.ts
 * @description Manages data durability by saving and loading game state from Firestore.
 * Handles world initialization, player autosaves, and shutdown procedures.
 * @importance Critical: Ensures that player progress and world changes are preserved across server restarts.
 */
import { db } from "../db";
import { players, worldObjects, spawners, entities, terrainData } from "../state";
import { serverLogger } from "../logger";
import admin from "firebase-admin";
import { redis, loadTerrainRedis, saveTerrainRedis } from "../redis";

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
    
    // 5. Initialize Spawner Counts
    const { spawnerEntityCounts } = await import("../state");
    spawnerEntityCounts.clear();
    entities.forEach(e => {
      if (e.spawnerId) {
        const current = spawnerEntityCounts.get(e.spawnerId) || 0;
        spawnerEntityCounts.set(e.spawnerId, current + 1);
      }
    });
    
    serverLogger.info("system", `LOAD COMPLETE: ${worldObjects.size} objects, ${entities.size} NPCs, ${spawners.size} spawners, ${terrainData.size} terrain tiles active.`);
  } catch (e: any) {
    serverLogger.error("system", "CRITICAL: World initialization failed", e.message);
  }
};

/**
 * Loads terrain tiles for a specific region. 
 * This is called on-demand as players move, preventing the need to load the entire world at once.
 */
export const loadTerrainRegion = async (centerX: number, centerZ: number) => {
  const currentChunkX = Math.floor(centerX / 100);
  const currentChunkZ = Math.floor(centerZ / 100);

  // Load a 3x3 grid of chunks around the player to ensure a buffer
  const loadPromises: Promise<void>[] = [];

  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      const tx = currentChunkX + dx;
      const tz = currentChunkZ + dz;
      const chunkId = `chunk_${tx}_${tz}`;
      const chunkKey = `loaded_chunk:${tx},${tz}`;

      loadPromises.push((async () => {
        if (await redis.exists(chunkKey)) return;

        try {
          // Check Redis Cache for specific points in this chunk if we had a per-point cache
          // But for now, we'll load from Firestore and cache the result.
          const snapshot = await db.collection("terrain").where("chunkId", "==", chunkId).get();
          if (!snapshot.empty) {
            const updates: any[] = [];
            snapshot.forEach((doc: admin.firestore.QueryDocumentSnapshot) => {
              const data = doc.data();
              const normalizedId = doc.id.replace(',', '_');
              const point = { y: data.y, type: data.type || 'grass' };
              terrainData.set(normalizedId, point);
              
              const [x, z] = normalizedId.split('_').map(Number);
              updates.push({ x, z, ...point });
            });
            
            // Mark as loaded in Redis to prevent redundant hits
            await redis.set(chunkKey, "true", "EX", 3600);
            
            // Also cache to our global terrain Redis hash for cross-instance sync
            if (updates.length > 0) await saveTerrainRedis(updates);
            
            serverLogger.info("system", `Loaded chunk ${chunkId} (${snapshot.size} tiles)`);
          }
        } catch (e: any) {
          serverLogger.error("system", `Failed to load chunk ${chunkId}`, e.message);
        }
      })());
    }
  }

  await Promise.all(loadPromises);
};

export const initializeTerrain = async () => {
  try {
    // Attempt to warm the local memory from the Redis cache on startup
    // This allows for immediate availability of modified terrain even before chunks are lazy-loaded
    serverLogger.info("system", "Warming terrain cache from Redis...");
    const redisTerrain = await loadTerrainRedis();
    if (redisTerrain.size > 0) {
      redisTerrain.forEach((val, key) => terrainData.set(key, val));
      serverLogger.info("system", `Pre-loaded ${terrainData.size} terrain modifications from Redis.`);
    }
  } catch (e: any) {
    serverLogger.error("system", "Failed to warm terrain cache", e.message);
  }

  serverLogger.info("system", "Terrain Engine Initialized (Lazy Loading Enabled)");
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
  const { dirtyPlayers } = await import("../state");
  if (dirtyPlayers.size === 0) return;
  
  // Clone the dirty map and clear it immediately
  const playersToSave = new Map(dirtyPlayers);
  dirtyPlayers.clear();
  
  const CHUNK_SIZE = 450; 
  const playerIds = Array.from(playersToSave.keys());
  
  for (let i = 0; i < playerIds.length; i += CHUNK_SIZE) {
    const chunkIds = playerIds.slice(i, i + CHUNK_SIZE);
    const batch = db.batch();
    let count = 0;
 
    for (const id of chunkIds) {
      const p = players.get(id);
      const changedFields = playersToSave.get(id);
      
      if (!p || !p.userId || !p.characterId || !changedFields) continue;

      const charRef = db.collection("users").doc(p.userId).collection("characters").doc(p.characterId);
      
      // Build dynamic payload based on dirty fields
      const payload: any = {
        lastActive: admin.firestore.FieldValue.serverTimestamp()
      };

      changedFields.forEach(field => {
        if (p[field] !== undefined) {
          payload[field] = p[field];
        }
      });

      batch.set(charRef, payload, { merge: true });
      count++;
    }

    try {
      if (count > 0) {
        await batch.commit();
        serverLogger.info("firestore", `Surgical Autosave complete. ${count} players updated with selective fields.`);
      }
    } catch (e: any) {
      serverLogger.error("firestore", "Surgical Autosave failed", e.message);
    }
  }
};


export const performShutdownSave = async () => {
  serverLogger.info("system", "Performing final shutdown save...");
  await autosavePlayers();
};

// Periodic save wrapper to maintain the interval if needed
export const startPeriodicTasks = () => {
  // 1. Player Autosave (5 minutes)
  setInterval(async () => {
    await autosavePlayers();
  }, 1000 * 60 * 5);

  // 2. Redis Ghost Cleanup (10 minutes)
  setInterval(async () => {
    const { cleanupGhostPlayers } = await import("../redis");
    await cleanupGhostPlayers();
  }, 1000 * 60 * 10);
};
