/**
 * @file server/systems/persistence.ts
 * @description Manages data durability by saving and loading game state from Firestore.
 * Handles world initialization, player autosaves, and shutdown procedures.
 * @importance Critical: Ensures that player progress and world changes are preserved across server restarts.
 */
import { db } from "../db";
import { players, worldObjects, spawners, entities, terrainData, spawnerEntityCounts } from "../state";
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
    spawnerEntityCounts.clear();
    objectGrid.clear();
    entityGrid.clear();
    
    serverLogger.info("system", "Starting world initialization from Firestore...");
    
    // 2. Load from authoritative 'world' collection
    const snapshot = await db.collection("world").get();
    
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const id = doc.id;
      
      // 2. Load from authoritative 'world' collection
      const worldObj = { id, ...data };
      
      worldObjects.set(id, worldObj);
      updateInGrid(objectGrid, id, null, data.pos);

      // 3. Handle Special Types (NPCs & Spawners)
      if (data.type.startsWith("npc_")) {
        const entityId = `npc-${id}`;
        const npcEntity = createNPCEntity(entityId, id, data.type, data.pos, data.rot, data);
        entities.set(entityId, npcEntity as any);
        updateInGrid(entityGrid, entityId, null, data.pos);
      } else if (data.type.startsWith("spawner_")) {
        // Register this world object as an active spawner
        const { registerSpawnerFromObject } = await import("./spawners");
        registerSpawnerFromObject(worldObj);
      }
    }

    // 4. Warm up the Interest Registry (So the server knows which chunks exist)
    if (redis.status === 'ready') {
      const terrainChunks = await db.collection("terrain_chunks").listDocuments();
      const objectChunks = await db.collection("object_chunks").listDocuments();
      const allChunkIds = new Set([...terrainChunks.map((d: any) => d.id), ...objectChunks.map((d: any) => d.id)]);
      
      if (allChunkIds.size > 0) {
        await redis.sadd("world:existing_chunks", ...Array.from(allChunkIds));
        serverLogger.info("redis", `Warmed up Interest Registry with ${allChunkIds.size} chunks.`);
      }
    }

    // 5. Load Spawners (Global for now, as they drive AI)
    await initializeSpawners();
    
    // 6. Initialize Terrain Engine (Lazy Loading will handle the rest)
    await initializeTerrain();
    
    serverLogger.info("system", `INITIAL LOAD COMPLETE: ${worldObjects.size} objects (Global), ${entities.size} NPCs.`);
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
      const terrainId = `chunk_${tx}_${tz}`;
      const objectId = `chunk_${tx}_${tz}`;
      const localKey = `${tx},${tz}`;

      loadPromises.push((async () => {
        const { loadedChunksLocal } = await import("../state");
        if (loadedChunksLocal.has(localKey)) return;

        try {
          // 0. INTEREST REGISTRY CHECK: Skip Firestore if we know this chunk is empty
          if (redis.status === 'ready') {
            const exists = await redis.sismember("world:existing_chunks", terrainId);
            if (!exists) {
              loadedChunksLocal.add(localKey);
              return;
            }
          }

          // 1. Fetch Terrain Chunk
          const terrainDoc = await db.collection("terrain_chunks").doc(terrainId).get();
          if (terrainDoc.exists) {
            const chunkData = terrainDoc.data()?.data || {};
            Object.entries(chunkData).forEach(([key, val]: [string, any]) => {
              terrainData.set(key, { y: val.y, type: val.type || 'grass' });
            });
          }

          // 2. Fetch Object Chunk (STRICT: Only load from 'objects' map)
          const objectDoc = await db.collection("object_chunks").doc(objectId).get();
          if (objectDoc.exists) {
            const chunkData = objectDoc.data()?.objects || {};
            const { OBJECT_TEMPLATES } = await import("../../src/data/world/templates");
            
            for (const [id, rawData] of Object.entries(chunkData as any)) {
              const data = rawData as any;
              // Template Inheritance: Merge saved data with template defaults
              const template = OBJECT_TEMPLATES[data.type];
              
              // SURGICAL FIX: If this is a tent or campfire with a legacy '1.0' scale, 
              // strip it so it correctly inherits the tiny scale from the template.
              const cleanData = { ...data };
              if (data.type === 'tent' && data.scale === 1) delete cleanData.scale;
              if (data.type === 'campfire' && data.scale === 1) delete cleanData.scale;

              const mergedObj = {
                id,
                ...template,
                ...cleanData
              };
              
              worldObjects.set(id, mergedObj);
              updateInGrid(objectGrid, id, null, mergedObj.pos);

              // Initialize NPCs & Spawners if they are part of this chunk
              if (mergedObj.type.startsWith("npc_")) {
                const entityId = `npc-${id}`;
                if (!entities.has(entityId)) {
                  const npcEntity = createNPCEntity(entityId, id, mergedObj.type, mergedObj.pos, mergedObj.rot, mergedObj);
                  entities.set(entityId, npcEntity as any);
                  updateInGrid(entityGrid, entityId, null, mergedObj.pos);
                }
              } else if (mergedObj.type.startsWith("spawner_")) {
                const { registerSpawnerFromObject } = await import("./spawners");
                await registerSpawnerFromObject(mergedObj);
              }
            }

            // BROADCAST: Tell clients about these newly loaded objects
            const { io } = await import("../../server") as any;
            io.emit("world_objects_sync", Array.from(worldObjects.values()));
            io.emit("entities_sync", Array.from(entities.values()));
          }
          
          loadedChunksLocal.add(localKey);
          serverLogger.info("system", `Loaded region ${localKey}: Terrain + Objects`);
        } catch (e: any) {
          serverLogger.error("system", `Failed to load region ${localKey}`, e.message);
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
  
  // REDIS WRITE-BACK: Save dirty players to Redis immediately for fast session persistence
  const playersToSave = new Map(dirtyPlayers);
  dirtyPlayers.clear();
  
  for (const [id, fields] of playersToSave.entries()) {
    const p = players.get(id);
    if (p) {
      // Create a copy for Redis storage with stringified objects
      const redisData = {
        ...p,
        pos: JSON.stringify(p.pos),
        rot: JSON.stringify(p.rot),
        stats: JSON.stringify(p.stats),
        inventory: JSON.stringify(p.inventory),
        equipment: JSON.stringify(p.equipment),
        hotbar: JSON.stringify(p.hotbar),
        quests: JSON.stringify(p.quests),
        lastActive: Date.now()
      };
      await redis.hset(`player:session:${p.characterId}`, redisData);
    }
  }
  
  serverLogger.info("redis", `Buffered ${playersToSave.size} player updates to Redis Write-Back cache.`);
};

export const flushRedisToFirestore = async () => {
  try {
    const keys = await redis.keys("player:session:*");
    if (keys.length === 0) return;

    const batch = db.batch();
    let count = 0;

    for (const key of keys) {
      const data = await redis.hgetall(key);
      if (!data.userId || !data.characterId) continue;

      const charRef = db.collection("users").doc(data.userId).collection("characters").doc(data.characterId);
      
      // MAP DATA BACK TO FIRESTORE SCHEMA
      const payload: any = {
        name: data.characterName, // Fix: characterName -> name
        class: data.class,
        color: data.color,
        level: parseInt(data.level) || 1,
        exp: parseInt(data.exp) || 0,
        maxExp: parseInt(data.maxExp) || 100,
        hp: parseFloat(data.hp) || 0,
        mp: parseFloat(data.mp) || 0,
        gold: parseInt(data.gold) || 0,
        lastActive: admin.firestore.FieldValue.serverTimestamp()
      };

      // Handle Complex JSON Fields
      try {
        if (data.pos) payload.pos = JSON.parse(data.pos);
        if (data.rot) payload.rot = JSON.parse(data.rot);
        if (data.stats) payload.stats = JSON.parse(data.stats);
        if (data.inventory) payload.inventory = JSON.parse(data.inventory);
        if (data.equipment) payload.equipment = JSON.parse(data.equipment);
        if (data.hotbar) payload.hotbar = JSON.parse(data.hotbar);
        if (data.quests) payload.quests = JSON.parse(data.quests);
      } catch (e: any) {
        serverLogger.error("persistence", `Failed to parse Redis data for ${data.characterName}: ${e.message}`);
      }

      batch.set(charRef, payload, { merge: true });
      count++;
      if (count >= 450) break;
    }

    if (count > 0) {
      await batch.commit();
      serverLogger.info("system", `Flushed ${count} player sessions from Redis to Firestore.`);
    }
  } catch (e: any) {
    serverLogger.error("system", "Failed to flush Redis to Firestore", e.message);
  }
};

export const performShutdownSave = async () => {
  serverLogger.info("system", "Performing final shutdown save...");
  await autosavePlayers();
  await flushRedisToFirestore();
};

// Periodic save wrapper to maintain the interval if needed
export const startPeriodicTasks = () => {
  // 1. Player Autosave to Redis (Every 1 minute)
  setInterval(async () => {
    await autosavePlayers();
  }, 1000 * 60);

  // 2. Redis to Firestore Flush (Every 30 minutes)
  setInterval(async () => {
    await flushRedisToFirestore();
  }, 1000 * 60 * 30);

  // 3. Redis Ghost Cleanup (10 minutes)
  setInterval(async () => {
    const { cleanupGhostPlayers } = await import("../redis");
    await cleanupGhostPlayers();
  }, 1000 * 60 * 10);
};
