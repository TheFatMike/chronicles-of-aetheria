/**
 * @file server/lib/cache.ts
 * @description Provides a high-level caching interface using Redis.
 * Supports transparent caching for database queries and expensive computations.
 * @importance Essential: Reduces Firestore costs and improves latency by avoiding redundant calls.
 */
import { redis } from "../redis";
import { serverLogger } from "../logger";

export const CACHE_TTL = {
  SHORT: 60,           // 1 minute
  MEDIUM: 3600,        // 1 hour
  LONG: 86400,         // 1 day
};

/**
 * Generic wrapper to cache the result of an async function.
 * @param key The Redis key to use for caching.
 * @param ttl Time-to-live in seconds.
 * @param fn The async function to execute if the cache is missing.
 */
export async function withCache<T>(key: string, ttl: number, fn: () => Promise<T>): Promise<T> {
  try {
    const cached = await redis.get(key);
    if (cached) {
      serverLogger.debug("cache", `Hit: ${key}`);
      return JSON.parse(cached) as T;
    }
  } catch (err) {
    serverLogger.error("cache", `Redis error on GET ${key}: ${err}`);
  }

  serverLogger.debug("cache", `Miss: ${key}. Fetching fresh data...`);
  const result = await fn();

  try {
    await redis.set(key, JSON.stringify(result), "EX", ttl);
  } catch (err) {
    serverLogger.error("cache", `Redis error on SET ${key}: ${err}`);
  }

  return result;
}

/**
 * Caches Firestore document results.
 */
export async function getCachedDoc<T>(collection: string, docId: string, ttl: number, fetcher: () => Promise<T>): Promise<T> {
  const key = `fs:${collection}:${docId}`;
  return withCache(key, ttl, fetcher);
}
