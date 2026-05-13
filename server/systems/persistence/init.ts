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
    if (redis.status !== 'ready') {
      serverLogger.info("redis", "Waiting for Redis to be ready for Interest Registry warmup...");
      await new Promise<void>((resolve) => {
        const check = () => {
          if (redis.status === 'ready') resolve();
          else setTimeout(check, 100);
        };
        check();
      });
    }

    if (redis.status === 'ready') {
      const terrainChunks = await db.collection("terrain_chunks").listDocuments();
      const objectChunks = await db.collection("object_chunks").listDocuments();
      const allChunkIds = new Set([...terrainChunks.map((d: any) => d.id), ...objectChunks.map((d: any) => d.id)]);
      
      // Clear old registry before warming up
      await redis.del("world:existing_chunks");
      
      if (allChunkIds.size > 0) {
        await redis.sadd("world:existing_chunks", ...Array.from(allChunkIds));
        serverLogger.info("redis", `Warmed up Interest Registry with ${allChunkIds.size} chunks.`);
      } else {
        serverLogger.info("redis", "Interest Registry is empty (no modified chunks in Firestore).");
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
    const { chunkToTerrain } = await import("../../state");
    serverLogger.info("system", "Warming terrain cache from Redis...");
    const redisTerrain = await loadTerrainRedis();
    if (redisTerrain.size > 0) {
      redisTerrain.forEach((val, key) => {
        terrainData.set(key, val);
        
        // Populate the chunk mapping so handleRequestTerrainSync can find these points
        const [x, z] = key.split('_').map(Number);
        const tx = Math.floor(x / 100);
        const tz = Math.floor(z / 100);
        const chunkKey = `${tx},${tz}`;
        
        if (!chunkToTerrain.has(chunkKey)) chunkToTerrain.set(chunkKey, new Set());
        chunkToTerrain.get(chunkKey)!.add(key);
      });
      serverLogger.info("system", `Pre-loaded ${terrainData.size} terrain modifications from Redis.`);
    }
  } catch (e: any) {
    serverLogger.error("system", "Failed to warm terrain cache", e.message);
  }
  serverLogger.info("system", "Terrain Engine Initialized (Lazy Loading Enabled)");
};

