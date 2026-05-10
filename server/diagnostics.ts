/**
 * @file server/diagnostics.ts
 * @description Comprehensive database diagnostic tool to verify Firestore and Redis data consistency.
 */
import { db, initDb } from "./db";
import { redis } from "./redis";
import { serverLogger } from "./logger";

export const getDatabaseStats = async () => {
  await initDb();
  
  const stats: any = {
    firestore: {},
    redis: {},
    timestamp: new Date().toISOString()
  };

  try {
    // Firestore Checks
    const worldSnap = await db.collection("world").count().get();
    stats.firestore.worldObjects = worldSnap.data().count;

    const terrainSnap = await db.collection("terrain").count().get();
    stats.firestore.terrainModifications = terrainSnap.data().count;

    const usersSnap = await db.collection("users").count().get();
    stats.firestore.totalUsers = usersSnap.data().count;

    // Redis Checks
    const terrainCacheCount = await redis.hlen("world:terrain");
    stats.redis.terrainCache = terrainCacheCount;

    const playerPosCount = await redis.zcard("world:player_positions");
    stats.redis.activePlayerPositions = playerPosCount;

    const redisKeys = await redis.keys("*");
    stats.redis.totalKeys = redisKeys.length;

    // Sampling terrain points and checking for height variations
    if (terrainCacheCount > 0) {
      const sample = await redis.hgetall("world:terrain");
      let maxY = -Infinity;
      let minY = Infinity;
      let nonZeroCount = 0;

      for (const val of Object.values(sample)) {
        const parsed = JSON.parse(val);
        if (parsed.y > maxY) maxY = parsed.y;
        if (parsed.y < minY) minY = parsed.y;
        if (parsed.y !== 0) nonZeroCount++;
      }

      const firstKey = Object.keys(sample)[0];
      stats.redis.terrainAnalysis = {
        totalPoints: terrainCacheCount,
        nonZeroHeights: nonZeroCount,
        minY,
        maxY,
        samplePoint: {
          key: firstKey,
          value: JSON.parse(sample[firstKey])
        }
      };
    }

    return stats;
  } catch (error: any) {
    serverLogger.error("diagnostics", `Diagnostic failed: ${error.message}`);
    return { error: error.message };
  }
};
