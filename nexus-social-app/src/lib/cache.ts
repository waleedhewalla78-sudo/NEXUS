// src/lib/cache.ts – robust Redis client with graceful fallback

import Redis from 'ioredis';

// Determine Redis connection URL. In development we attempt to connect to a local Redis instance.
// If REDIS_URL is not set, default to localhost. This can be overridden in production (e.g., Upstash).
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

let redis: Redis | null = null;
try {
  // Initialise Redis client. This may throw if the URL is malformed.
  redis = new Redis(redisUrl);
  // Log connection errors but prevent them from crashing the process.
  redis.on('error', (err) => {
    console.error('[ioredis] connection error:', err.message);
    // Keep redis instance alive; subsequent calls will also error which we handle.
  });
} catch (e) {
  console.error('[ioredis] failed to initialise client:', (e as Error).message);
  redis = null;
}

/** Helper to safely execute a Redis command, returning undefined on failure. */
async function safeExec<T>(fn: () => Promise<T>): Promise<T | undefined> {
  if (!redis) return undefined;
  try {
    return await fn();
  } catch (err) {
    console.error('[ioredis] operation error:', (err as Error).message);
    return undefined;
  }
}

/** Set a cache value with optional TTL (seconds). */
export async function setCache(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
  await safeExec(() => redis!.set(key, JSON.stringify(value), 'EX', ttlSeconds));
}

/** Retrieve a cached value and parse JSON. Returns null if not found or on error. */
export async function getCache<T>(key: string): Promise<T | null> {
  const data = await safeExec(() => redis!.get(key));
  if (!data) return null;
  try {
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
}

/** Invalidate cached keys matching a pattern. */
export async function invalidateCache(keyPattern: string): Promise<void> {
  const keys = await safeExec(() => redis!.keys(keyPattern));
  if (keys && keys.length > 0) {
    await safeExec(() => redis!.del(...keys));
  }
}

// Export a placeholder when Redis is unavailable to keep import statements valid.
export default redis;

