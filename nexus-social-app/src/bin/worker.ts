import '../lib/load-env-config';
import { applyNodeWebSocketPolyfill } from '../lib/supabase/node-websocket-polyfill';

applyNodeWebSocketPolyfill();

import Redis from 'ioredis';
import { processAiOrchestrationJob } from '../jobs/ai-orchestration';
import { publishDuePosts } from '../jobs/publish-due-posts';
import { syncAnalytics } from '../jobs/sync-analytics';
import { refreshExpiringTokens } from '../jobs/refresh-tokens';
import { syncListening } from '../jobs/sync-listening';
import { syncReviews } from '../jobs/sync-reviews';
import { ingestPostAnalyticsRag } from '../jobs/ingest-post-analytics-rag';
import { supabaseAdmin } from '../lib/supabase/server';
import { processMigrationJob } from '../jobs/process-migration';
import { startWebhookDeliveryConsumer } from '../lib/webhooks/delivery';
import { startMarketingEventConsumer } from '../lib/events/marketing-event-worker';
import { startRedisToInngestBridge } from '../lib/orchestration/bridge/redis-to-inngest';
import {
  startCampaignJobConsumer,
  startCampaignReplanConsumer,
} from '../jobs/campaign-orchestration';
import { refreshAiCmoMaterializedViews } from '../jobs/ai-cmo/refresh-mvs';
import { syncCampaignOutcomesFromAnalytics } from '../jobs/ai-cmo/sync-outcomes';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const PUBLISH_INTERVAL_MS = Number(process.env.PUBLISH_INTERVAL_MS ?? 60_000);
const AI_CMO_MV_REFRESH_INTERVAL_MS = Number(process.env.AI_CMO_MV_REFRESH_INTERVAL_MS ?? 3_600_000);
const AI_CMO_OUTCOMES_SYNC_INTERVAL_MS = Number(process.env.AI_CMO_OUTCOMES_SYNC_INTERVAL_MS ?? 3_600_000);
const SYNC_ANALYTICS_INTERVAL_MS = Number(process.env.SYNC_ANALYTICS_INTERVAL_MS ?? 21_600_000);
const TOKEN_REFRESH_INTERVAL_MS = Number(process.env.TOKEN_REFRESH_INTERVAL_MS ?? 3_600_000);
const REPUTATION_SYNC_INTERVAL_MS = Number(process.env.REPUTATION_SYNC_INTERVAL_MS ?? 3_600_000);
const RAG_INGEST_INTERVAL_MS = Number(process.env.RAG_INGEST_INTERVAL_MS ?? 21_600_000);
const WORKER_HEARTBEAT_KEY = 'worker:heartbeat';
const WORKER_HEARTBEAT_TTL_SEC = 120;

async function touchWorkerHeartbeat() {
  try {
    await redis.set(WORKER_HEARTBEAT_KEY, new Date().toISOString(), 'EX', WORKER_HEARTBEAT_TTL_SEC);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn('[Worker] Heartbeat write failed:', message);
  }
}

// 1. Run Migration Poller loop concurrently
async function startMigrationPoller() {
  console.log('[Worker] Started background migration poller loop.');
  while (true) {
    try {
      console.log('[Worker] Checking for pending migrations...');
      const { data: migrations, error } = await supabaseAdmin
        .from('migration_status')
        .select('id')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[Worker] Database error checking migrations:', error.message);
      } else if (migrations && migrations.length > 0) {
        console.log(`[Worker] Found ${migrations.length} pending migrations.`);
        for (const migration of migrations) {
          console.log(`[Worker] Processing migration: ${migration.id}`);
          try {
            await processMigrationJob(migration.id);
          } catch (err: any) {
            console.error(`[Worker] Failed to process migration ${migration.id}:`, err.message);
          }
        }
      }
    } catch (err: any) {
      console.error('[Worker] Migration loop exception:', err.message);
    }
    // Poll migrations every 5 seconds
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
}

async function startPublishLoop() {
  console.log(`[Worker] Started publish-due-posts loop (every ${PUBLISH_INTERVAL_MS}ms).`);
  while (true) {
    try {
      await touchWorkerHeartbeat();
      const result = await publishDuePosts();
      if (result.processed > 0) {
        console.log(
          `[Worker] Publish batch: processed=${result.processed} published=${result.published} failed=${result.failed}`,
        );
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[Worker] Publish loop exception:', message);
    }
    await new Promise((resolve) => setTimeout(resolve, PUBLISH_INTERVAL_MS));
  }
}

async function startTokenRefreshLoop() {
  console.log(
    `[Worker] Started refresh-tokens loop (every ${TOKEN_REFRESH_INTERVAL_MS}ms).`,
  );
  while (true) {
    try {
      await touchWorkerHeartbeat();
      const result = await refreshExpiringTokens();
      if (result.processed > 0) {
        console.log(
          `[Worker] Token refresh: processed=${result.processed} refreshed=${result.refreshed} skipped=${result.skipped} errors=${result.errors}`,
        );
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[Worker] Token refresh loop exception:', message);
    }
    await new Promise((resolve) => setTimeout(resolve, TOKEN_REFRESH_INTERVAL_MS));
  }
}

async function startAnalyticsSyncLoop() {
  console.log(
    `[Worker] Started sync-analytics loop (every ${SYNC_ANALYTICS_INTERVAL_MS}ms).`,
  );
  while (true) {
    try {
      await touchWorkerHeartbeat();
      const result = await syncAnalytics();
      if (result.processed > 0) {
        console.log(
          `[Worker] Analytics sync: posts=${result.processed} synced=${result.synced} errors=${result.errors}`,
        );
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[Worker] Analytics sync loop exception:', message);
    }
    await new Promise((resolve) => setTimeout(resolve, SYNC_ANALYTICS_INTERVAL_MS));
  }
}

// 2. Run AI Orchestration BRPOP queue loop
async function startReputationSyncLoop() {
  console.log(`[Worker] Started reputation sync loop (every ${REPUTATION_SYNC_INTERVAL_MS}ms).`);
  while (true) {
    try {
      await touchWorkerHeartbeat();
      const listening = await syncListening();
      const reviews = await syncReviews();
      if (listening.processed > 0 || reviews.processed > 0) {
        console.log(
          `[Worker] Reputation sync: listening=${listening.ingested}/${listening.processed} reviews=${reviews.ingested}/${reviews.processed}`,
        );
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[Worker] Reputation sync loop exception:', message);
    }
    await new Promise((resolve) => setTimeout(resolve, REPUTATION_SYNC_INTERVAL_MS));
  }
}

async function startRagIngestLoop() {
  console.log(`[Worker] Started post_analytics RAG ingest loop (every ${RAG_INGEST_INTERVAL_MS}ms).`);
  while (true) {
    try {
      await touchWorkerHeartbeat();
      const result = await ingestPostAnalyticsRag();
      if (result.processed > 0) {
        console.log(
          `[Worker] RAG ingest: processed=${result.processed} ingested=${result.ingested} skipped=${result.skipped}`,
        );
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[Worker] RAG ingest loop exception:', message);
    }
    await new Promise((resolve) => setTimeout(resolve, RAG_INGEST_INTERVAL_MS));
  }
}

async function startAiCmoMvRefreshLoop() {
  const enabled = (process.env.AI_CMO_MV_REFRESH_ENABLED ?? 'true').toLowerCase() !== 'false';
  if (!enabled) {
    console.log('[Worker] AI CMO MV refresh loop disabled.');
    return;
  }

  console.log(
    `[Worker] Started AI CMO MV refresh loop (every ${AI_CMO_MV_REFRESH_INTERVAL_MS}ms).`,
  );

  while (true) {
    try {
      await touchWorkerHeartbeat();
      const result = await refreshAiCmoMaterializedViews();
      if (result.refreshed) {
        console.log(`[Worker] Refreshed AI CMO MVs: ${result.views.join(', ')}`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[Worker] AI CMO MV refresh loop exception:', message);
    }
    await new Promise((resolve) => setTimeout(resolve, AI_CMO_MV_REFRESH_INTERVAL_MS));
  }
}

async function startAiCmoOutcomesSyncLoop() {
  console.log(`[Worker] Started AI CMO outcomes sync loop (every ${AI_CMO_OUTCOMES_SYNC_INTERVAL_MS}ms).`);
  while (true) {
    try {
      await touchWorkerHeartbeat();
      const result = await syncCampaignOutcomesFromAnalytics();
      if (result.processed > 0) {
        console.log(
          `[Worker] AI CMO outcomes: processed=${result.processed} synced=${result.synced} skipped=${result.skipped} errors=${result.errors}`,
        );
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[Worker] AI CMO outcomes sync loop exception:', message);
    }
    await new Promise((resolve) => setTimeout(resolve, AI_CMO_OUTCOMES_SYNC_INTERVAL_MS));
  }
}

async function startAiQueueConsumer() {
  console.log('[Worker] Started AI queue consumer (BRPOP) loop.');
  const queueKey = 'queue:ai-orchestration';

  while (true) {
      try {
        // BRPOP returns [key, value]
        const result = await redis.brpop(queueKey, 0);
        if (result) {
          const [_, value] = result;
          console.log('[Worker] Popped AI orchestration job:', value);
          try {
            const jobPayload = JSON.parse(value);
            await processAiOrchestrationJob(jobPayload);
          } catch (err: any) {
            console.error('[Worker] Failed to process AI orchestration job:', err.message);
          }
        }
      } catch (err: any) {
        console.error('[Worker] AI queue consumer exception:', err.message);
        // Exponential backoff on consecutive errors
        let backoff = 1000;
        for (let i = 0; i < 5; i++) {
          await new Promise((resolve) => setTimeout(resolve, backoff));
          backoff = Math.min(backoff * 2, 30000);
          try {
            const result = await redis.brpop(queueKey, 0);
            if (result) {
              const [_, value] = result;
              console.log('[Worker] Popped AI orchestration job after backoff:', value);
              const jobPayload = JSON.parse(value);
              await processAiOrchestrationJob(jobPayload);
              break; // success
            }
          } catch (e) {
            console.error('[Worker] Retry failed:', (e as any).message);
          }
        }
      }
    }
}

async function startRedisToInngestBridgeSafe() {
  const enabled =
    (process.env.AI_CMO_REDIS_INNGEST_BRIDGE_ENABLED ?? 'true').toLowerCase() !== 'false';
  if (!enabled) {
    console.log('[Worker] Redis→Inngest bridge disabled (AI_CMO_REDIS_INNGEST_BRIDGE_ENABLED=false).');
    return;
  }

  try {
    console.log('[Worker] Starting Redis→Inngest bridge (004 autonomous loop)...');
    await startRedisToInngestBridge({ redis });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(
      '[Worker] Redis→Inngest bridge failed to start — 003 publish/analytics loops unaffected:',
      message,
    );
    // Keep worker alive; bridge loop retries internally when started successfully
    await new Promise(() => {
      /* intentional — do not exit worker if bridge startup throws */
    });
  }
}

async function start() {
  console.log('[Worker] Starting background worker service...');
  
  // Start both loops concurrently
  const migrations = startMigrationPoller();
  const publishLoop = startPublishLoop();
  const analyticsSync = startAnalyticsSyncLoop();
  const tokenRefresh = startTokenRefreshLoop();
  const reputationSync = startReputationSyncLoop();
  const ragIngest = startRagIngestLoop();
  const aiConsumer = startAiQueueConsumer();
  const webhooks = startWebhookDeliveryConsumer();
  const marketingEvents = startMarketingEventConsumer({ redis });
  let redisInngestBridge: Promise<void>;
  try {
    redisInngestBridge = startRedisToInngestBridgeSafe();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn('[Worker] Redis→Inngest bridge init error (003 unaffected):', message);
    redisInngestBridge = new Promise(() => {
      /* noop — worker continues */
    });
  }
  const campaignJobs = startCampaignJobConsumer(redis);
  const campaignReplans = startCampaignReplanConsumer(redis);
  const aiCmoMvRefresh = startAiCmoMvRefreshLoop();
  const aiCmoOutcomesSync = startAiCmoOutcomesSyncLoop();

  // Graceful shutdown handling
  const shutdown = async () => {
    console.log('[Worker] Shutting down...');
    try {
      await redis.quit();
    } catch (e) { console.error('[Worker] Error closing Redis', (e as any).message); }
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  
  await Promise.all([
    migrations,
    publishLoop,
    analyticsSync,
    tokenRefresh,
    reputationSync,
    ragIngest,
    aiConsumer,
    webhooks,
    marketingEvents,
    redisInngestBridge,
    campaignJobs,
    campaignReplans,
    aiCmoMvRefresh,
    aiCmoOutcomesSync,
  ]);
}

start();
