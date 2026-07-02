import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

let client: Redis | null = null;

export function getRedisClient(): Redis {
  if (!client) {
    client = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      commandTimeout: 5000,
      retryStrategy: (times) => Math.min(times * 200, 2_000),
    });
    client.on('error', (err) => {
      console.error('[redis] connection error:', err.message);
    });
  }
  return client;
}

export function resetRedisClientForTests(): void {
  if (client) {
    client.disconnect();
    client = null;
  }
}
