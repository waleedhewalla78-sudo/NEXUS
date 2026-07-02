/**
 * Redis-backed AI ops metrics for /admin/ai-ops health (Phase F partial).
 */

import Redis from 'ioredis';
import { CAMPAIGN_QUEUE_KEY } from '@/lib/ai-cmo/campaign-job-store';
import { MARKETING_DLQ_STREAM } from '@/lib/events/marketing-event-dlq';
import { marketingEventBusUtils } from '@/lib/events/marketing-event-bus';

const WORKER_HEARTBEAT_KEY = 'worker:heartbeat';
const MARKETING_STREAM_KEY = marketingEventBusUtils.STREAM_KEY;

export type AiOpsMetrics = {
  workerHeartbeat: string | null;
  workerAlive: boolean;
  campaignQueueDepth: number;
  marketingEventStreamLength: number;
  marketingDlqLength: number;
  collectedAt: string;
};

function createRedisClient(): Redis {
  return new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 1,
    lazyConnect: true,
    enableOfflineQueue: false,
  });
}

export async function collectAiOpsMetrics(): Promise<AiOpsMetrics> {
  const redis = createRedisClient();

  try {
    await redis.connect();

    const [heartbeat, campaignQueueDepth, marketingEventStreamLength, marketingDlqLength] =
      await Promise.all([
        redis.get(WORKER_HEARTBEAT_KEY),
        redis.llen(CAMPAIGN_QUEUE_KEY),
        redis.xlen(MARKETING_STREAM_KEY),
        redis.xlen(MARKETING_DLQ_STREAM),
      ]);

    return {
      workerHeartbeat: heartbeat,
      workerAlive: Boolean(heartbeat),
      campaignQueueDepth,
      marketingEventStreamLength,
      marketingDlqLength,
      collectedAt: new Date().toISOString(),
    };
  } finally {
    redis.disconnect();
  }
}

export const aiOpsMetricsUtils = {
  collectAiOpsMetrics,
};
