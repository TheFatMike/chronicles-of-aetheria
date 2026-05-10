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

// Graceful Shutdown Handler
const shutdown = async () => {
  serverLogger.info("redis", "Closing Redis connections...");
  try {
    await Promise.all([
      redis.quit(),
      redisSub.quit()
    ]);
  } catch (e) {}
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

redis.on("connect", () => {
  serverLogger.info("redis", "Connected to Redis successfully.");
});

redis.on("error", (err) => {
  serverLogger.error("redis", `Redis Connection Error: ${err.message}`);
});

/**
 * Updates player position in Redis using Geo-spatial indexing.
 * This allows for high-performance proximity queries.
 */
export const updatePlayerPositionRedis = async (playerId: string, pos: [number, number, number]) => {
  try {
    // Redis GEO expects [longitude, latitude]. We map [x, z] to these.
    // Note: Redis Geo uses a limit of -180 to 180 for long and -85 to 85 for lat.
    // If the game world is larger, we might need to scale coordinates or use a different approach.
    // For now, we'll assume a standard small-to-medium world size.
    await redis.geoadd("world:player_positions", pos[0], pos[2], playerId);
    
    // Store metadata in a hash for quick retrieval of all player properties
    await redis.hset(`player:${playerId}`, {
      pos: JSON.stringify(pos),
      lastUpdate: Date.now()
    });
    
    // Set expiry to clean up disconnected/crashed players (e.g., 5 minutes)
    // This is crucial for keeping the free-tier memory usage low.
    await redis.expire(`player:${playerId}`, 300);
    await redis.expire("world:player_positions", 600); // Also expire the geo set if it's not updated
  } catch (err: any) {
    // Only log if it's not a coordinate out of range error (which is common if coordinates are large)
    if (!err.message.includes("out of range")) {
      serverLogger.error("redis", `Redis Position Update Error: ${err.message}`);
    }
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
 * Periodically cleans up the player_positions set to ensure no "ghost" players remain
 * if the server crashes or disconnect logic fails.
 */
export const cleanupGhostPlayers = async () => {
  try {
    // In a production environment with many players, we'd use ZSCAN.
    // For free-tier/small scale, ZRANGE is acceptable.
    const allPlayerIds = await redis.zrange("world:player_positions", 0, -1);
    const pipeline = redis.pipeline();
    
    for (const id of allPlayerIds) {
      // Check if the player hash still exists
      const exists = await redis.exists(`player:${id}`);
      if (!exists) {
        pipeline.zrem("world:player_positions", id);
      }
    }
    
    await pipeline.exec();
  } catch (err) {
    serverLogger.error("redis", `Ghost player cleanup failed: ${err}`);
  }
};
