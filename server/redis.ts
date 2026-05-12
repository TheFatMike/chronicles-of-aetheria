/**
 * @file server/redis.ts
 * @description Manages Redis connections and provides geospatial indexing for player positions.
 * Supports real-time proximity queries and global messaging via Pub/Sub.
 * @importance Essential: Critical for performance-sensitive features like player visibility and global chat synchronization.
 */
import Redis from "ioredis";
import { serverLogger } from "./logger";
import dotenv from "dotenv";

dotenv.config();

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  retryStrategy: (times) => {
    return Math.min(times * 50, 2000);
  }
});

// Dedicated connection for Subscribing (MMO Pub/Sub)
export const redisSub = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  retryStrategy: (times) => {
    return Math.min(times * 50, 2000);
  }
});

// Graceful Shutdown - Moved to server.ts to ensure persistence finishes first
export const closeRedis = async () => {
  serverLogger.info("redis", "Closing Redis connections...");
  try {
    await Promise.all([
      redis.quit(),
      redisSub.quit()
    ]);
  } catch (e) {}
};

redis.on("connect", () => {
  serverLogger.info("redis", "Connected to Redis successfully.");
});

redis.on("error", (err) => {
  serverLogger.error("redis", `Redis Connection Error: ${err.message}`);
});

/**
 * Updates player position in Redis using Geo-spatial indexing.
 * We now use characterId for the primary hash to ensure persistence across socket refreshes.
 */
export const updatePlayerPositionRedis = async (playerId: string, characterId: string, pos: [number, number, number]) => {
  try {
    // Spatial index still uses playerId for real-time proximity (socket-based)
    await redis.geoadd("world:player_positions", pos[0], pos[2], playerId);
    
    // BUT the persistent session data uses characterId
    await redis.hset(`player:session:${characterId}`, {
      pos: JSON.stringify(pos),
      lastUpdate: Date.now()
    });
    
    // Set expiry (e.g., 30 minutes for character session)
    await redis.expire(`player:session:${characterId}`, 1800);
    await redis.expire("world:player_positions", 600); 
  } catch (err: any) {
    if (!err.message.includes("out of range")) {
      serverLogger.error("redis", `Redis Position Update Error: ${err.message}`);
    }
  }
};

/**
 * Retrieves the last known position for a character from Redis.
 */
export const getCharacterPositionRedis = async (characterId: string): Promise<[number, number, number] | null> => {
  try {
    const data = await redis.hget(`player:session:${characterId}`, "pos");
    return data ? JSON.parse(data) : null;
  } catch (err) {
    return null;
  }
};

export const getNearbyPlayersRedis = async (x: number, z: number, radius: number) => {
  try {
    return await redis.georadius("world:player_positions", x, z, radius, "m");
  } catch (err: any) {
    return [];
  }
};

/**
 * Optimized removal of player data.
 * Uses a pipeline to reduce round-trips to the Redis server, which is important for free-tier latency.
 */
export const removePlayerRedis = async (playerId: string) => {
  try {
    const pipeline = redis.pipeline();
    pipeline.zrem("world:player_positions", playerId);
    pipeline.del(`player:${playerId}`);
    // Also remove any chat-related transient data if exists
    pipeline.del(`chat:limit:${playerId}`);
    await pipeline.exec();
    serverLogger.debug("redis", `Cleaned up Redis data for player ${playerId}`);
  } catch (err) {
    serverLogger.error("redis", `Error removing player from Redis: ${err}`);
  }
};

/**
 * Specifically removes a character session from the Redis Write-Back cache.
 * This is vital when deleting characters to ensure they don't get 'saved back' to Firestore.
 */
export const removeCharacterSessionRedis = async (characterId: string) => {
  try {
    await redis.del(`player:session:${characterId}`);
    serverLogger.info("redis", `Purged session for deleted character: ${characterId}`);
  } catch (err) {
    serverLogger.error("redis", `Error purging character session: ${err}`);
  }
};

/**
 * Periodically cleans up the player_positions set to ensure no "ghost" players remain
 * if the server crashes or disconnect logic fails.
 */
export const cleanupGhostPlayers = async () => {
  try {
    // In a production environment with many players, we'd use ZSCAN.
    // For free-tier/small scale, ZRANGE is acceptable.
    const allPlayerIds = await redis.zrange("world:player_positions", 0, -1);
    if (allPlayerIds.length === 0) return;

    // Use a pipeline to check existence of all players in one round-trip
    const existPipeline = redis.pipeline();
    allPlayerIds.forEach(id => existPipeline.exists(`player:${id}`));
    const results = await existPipeline.exec();

    const cleanupPipeline = redis.pipeline();
    let cleanupCount = 0;

    results?.forEach(([err, exists], index) => {
      if (!err && !exists) {
        cleanupPipeline.zrem("world:player_positions", allPlayerIds[index]);
        cleanupCount++;
      }
    });
    
    if (cleanupCount > 0) {
      await cleanupPipeline.exec();
      serverLogger.info("redis", `Cleaned up ${cleanupCount} ghost players from spatial index.`);
    }
  } catch (err) {
    serverLogger.error("redis", `Ghost player cleanup failed: ${err}`);
  }
};

/**
 * Saves a chunk of terrain modifications to Redis for fast cross-instance access.
 */
export const saveTerrainRedis = async (points: { x: number, z: number, y: number, type: string }[]) => {
  try {
    const pipeline = redis.pipeline();
    for (const p of points) {
      const key = `${p.x}_${p.z}`;
      pipeline.hset("world:terrain", key, JSON.stringify({ y: p.y, type: p.type }));
    }
    await pipeline.exec();
  } catch (err) {
    serverLogger.error("redis", `Error saving terrain to Redis: ${err}`);
  }
};

/**
 * Loads all terrain modifications from Redis.
 */
export const loadTerrainRedis = async (): Promise<Map<string, { y: number, type: string }>> => {
  try {
    const data = await redis.hgetall("world:terrain");
    const terrainMap = new Map<string, { y: number, type: string }>();
    
    for (const [key, value] of Object.entries(data)) {
      terrainMap.set(key, JSON.parse(value));
    }
    
    return terrainMap;
  } catch (err) {
    serverLogger.error("redis", `Error loading terrain from Redis: ${err}`);
    return new Map();
  }
};
