/**
 * @file server/systems/persistence/init.ts
 * @description Handles the initial world state loading from Firestore.
 */
import { db } from "../../db";
import { worldObjects, spawners, entities, terrainData, spawnerEntityCounts } from "../../state";
import { serverLogger } from "../../logger";
import admin from "firebase-admin";
import { redis, loadTerrainRedis } from "../../redis";
import { createNPCEntity } from "../../lib/entities";
import { updateInGrid, objectGrid, entityGrid } from "../spatial";

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
        const { registerSpawnerFromObject } = await import("../spawners");
        registerSpawnerFromObject(worldObj);
      }
    }

    // 4. Warm up the Interest Registry
    if (redis.status === 'ready') {
      const terrainChunks = await db.collection("terrain_chunks").listDocuments();
      const objectChunks = await db.collection("object_chunks").listDocuments();
      const allChunkIds = new Set([...terrainChunks.map((d: any) => d.id), ...objectChunks.map((d: any) => d.id)]);
      
      if (allChunkIds.size > 0) {
        await redis.sadd("world:existing_chunks", ...Array.from(allChunkIds));
        serverLogger.info("redis", `Warmed up Interest Registry with ${allChunkIds.size} chunks.`);
      }
    }

    await initializeSpawners();
    await initializeTerrain();
    
    serverLogger.info("system", `INITIAL LOAD COMPLETE: ${worldObjects.size} objects (Global), ${entities.size} NPCs.`);
  } catch (e: any) {
    serverLogger.error("system", "CRITICAL: World initialization failed", e.message);
  }
};

export const initializeTerrain = async () => {
  try {
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
        respawnTime: 10,
        ...data
      };
      spawners.set(id, spawnerData);
    });
  } catch (e: any) {
    serverLogger.error("system", "Failed to load spawners", e.message);
  }
};
