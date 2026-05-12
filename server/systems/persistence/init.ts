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
    
    serverLogger.info("system", "Initializing World (Lazy Loading Enabled)...");
    
    // 2. Warm up the Interest Registry
    // This tells the server which chunks actually have data in Firestore
    if (redis.status === 'ready') {
      const terrainChunks = await db.collection("terrain_chunks").listDocuments();
      const objectChunks = await db.collection("object_chunks").listDocuments();
      const allChunkIds = new Set([...terrainChunks.map((d: any) => d.id), ...objectChunks.map((d: any) => d.id)]);
      
      if (allChunkIds.size > 0) {
        await redis.sadd("world:existing_chunks", ...Array.from(allChunkIds));
        serverLogger.info("redis", `Warmed up Interest Registry with ${allChunkIds.size} chunks.`);
      }
    }

    await initializeTerrain();
    
    serverLogger.info("system", `INITIAL LOAD COMPLETE: Lazy system ready.`);
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

