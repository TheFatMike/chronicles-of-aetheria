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
    await redis.expire(`player:${playerId}`, 300);
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
