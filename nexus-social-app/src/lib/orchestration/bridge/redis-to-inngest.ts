/**
 * Feature 004 — Redis Streams (003) → Inngest (004) event bridge.
 * Wired to `src/bin/worker.ts` via `startRedisToInngestBridge()` (INT-01).
 *
 * [SPEC]
 * - Reads 003 marketing events from configurable Redis stream (default from env)
 * - Uses a dedicated consumer group (default `marketing:inngest-bridge`) — does not steal from 003 handlers
 * - Maps 003 event types to ai-cmo/* Inngest events
 * - Never hardcodes stream keys — uses RedisToInngestBridgeConfig
 * - 003 isolation: read-only on Redis; send-only on Inngest
 */

import type Redis from 'ioredis';
import type { MarketingEvent, MarketingEventType } from '@/lib/events/marketing-event-bus';
import {
  allMarketingStreamShardKeys,
} from '@/lib/events/marketing-stream-sharding';
import { AI_CMO_INNGEST_EVENT_NAMES } from '@/lib/orchestration/types/events';
import { getInngestClient, isInngestStubClient } from '@/lib/orchestration/inngest-client';

export const DEFAULT_REDIS_STREAM_KEY = process.env.MARKETING_EVENTS_STREAM_KEY ?? 'marketing:events';
export const DEFAULT_REDIS_SHARDED_STREAM_KEYS = allMarketingStreamShardKeys();
export const DEFAULT_REDIS_CONSUMER_GROUP =
  process.env.MARKETING_EVENTS_CONSUMER_GROUP ?? 'marketing:workers';
export const DEFAULT_INNGEST_BRIDGE_CONSUMER_GROUP =
  process.env.MARKETING_INNGEST_BRIDGE_GROUP ?? 'marketing:inngest-bridge';

const BRIDGE_BLOCK_MS = 2000;
const BRIDGE_MAX_BACKOFF_MS = 30_000;

export type RedisToInngestMapping = {
  /** 003 Redis marketing event type */
  sourceType: MarketingEventType | string;
  /** 004 Inngest event name (must be ai-cmo/*) */
  targetInngestEvent: string;
  /** Optional transform for payload shape */
  transformPayload?: (
    event: MarketingEvent,
  ) => Record<string, unknown>;
};

export type RedisToInngestBridgeConfig = {
  redisStreamKey: string;
  redisConsumerGroup: string;
  mappings: RedisToInngestMapping[];
};

export type StartRedisToInngestBridgeOptions = {
  redis: Redis;
  config?: Partial<RedisToInngestBridgeConfig>;
  /** Separate consumer group — avoids competing with 003 `marketing:workers` handlers */
  bridgeConsumerGroup?: string;
  log?: (message: string, meta?: Record<string, unknown>) => void;
};

export type RedisToInngestBridgeHandle = {
  stop: () => void;
};

function parseStreamFieldsToMarketingEvent(fields: string[]): MarketingEvent | null {
  const map: Record<string, string> = {};
  for (let i = 0; i < fields.length; i += 2) {
    map[fields[i]] = fields[i + 1];
  }
  if (!map.type || !map.workspaceId || !map.idempotencyKey) {
    return null;
  }
  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(map.payload ?? '{}') as Record<string, unknown>;
  } catch {
    payload = {};
  }
  return {
    id: map.id ?? `evt_${Date.now()}`,
    type: map.type as MarketingEventType,
    workspaceId: map.workspaceId,
    payload,
    idempotencyKey: map.idempotencyKey,
    occurredAt: map.occurredAt ?? new Date().toISOString(),
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const DEFAULT_REDIS_TO_INNGEST_MAPPINGS: RedisToInngestMapping[] = [
  {
    sourceType: 'marketing.campaign.underperforming',
    targetInngestEvent: AI_CMO_INNGEST_EVENT_NAMES.CAMPAIGN_UNDERPERFORMING,
    transformPayload: (event) => ({
      workspaceId: event.workspaceId,
      campaignId: String(event.payload.campaignId ?? ''),
      trigger: 'underperforming' as const,
      sourceEventId: event.id,
      requestedAt: event.occurredAt,
    }),
  },
  {
    sourceType: 'marketing.budget.threshold_hit',
    targetInngestEvent: AI_CMO_INNGEST_EVENT_NAMES.REPLAN_REQUESTED,
    transformPayload: (event) => ({
      workspaceId: event.workspaceId,
      campaignId: String(event.payload.campaignId ?? ''),
      trigger: 'budget_threshold' as const,
      sourceEventId: event.id,
      requestedAt: event.occurredAt,
    }),
  },
  {
    sourceType: 'marketing.analytics.synced',
    targetInngestEvent: 'ai-cmo/analytics.synced',
    transformPayload: (event) => ({
      workspaceId: event.workspaceId,
      postId: event.payload.postId,
      syncedAt: event.occurredAt,
      metrics: event.payload.metrics ?? {},
    }),
  },
];

export function resolveRedisToInngestBridgeConfig(
  overrides?: Partial<RedisToInngestBridgeConfig>,
): RedisToInngestBridgeConfig {
  return {
    redisStreamKey: overrides?.redisStreamKey ?? DEFAULT_REDIS_STREAM_KEY,
    redisConsumerGroup: overrides?.redisConsumerGroup ?? DEFAULT_REDIS_CONSUMER_GROUP,
    mappings: overrides?.mappings ?? DEFAULT_REDIS_TO_INNGEST_MAPPINGS,
  };
}

export function mapRedisMarketingEventToInngest(
  event: MarketingEvent,
  config: RedisToInngestBridgeConfig = resolveRedisToInngestBridgeConfig(),
): { name: string; data: Record<string, unknown> } | null {
  const mapping = config.mappings.find((m) => m.sourceType === event.type);
  if (!mapping) {
    return null;
  }

  if (!mapping.targetInngestEvent.startsWith('ai-cmo/')) {
    throw new Error(
      `Bridge target "${mapping.targetInngestEvent}" must use ai-cmo/ namespace`,
    );
  }

  const data = mapping.transformPayload
    ? mapping.transformPayload(event)
    : {
        workspaceId: event.workspaceId,
        sourceEventId: event.id,
        payload: event.payload,
        occurredAt: event.occurredAt,
      };

  return {
    name: mapping.targetInngestEvent,
    data,
  };
}

export async function forwardRedisEventToInngest(
  event: MarketingEvent,
  config?: RedisToInngestBridgeConfig,
): Promise<{ forwarded: boolean; inngestEventName?: string }> {
  const mapped = mapRedisMarketingEventToInngest(event, config);
  if (!mapped) {
    return { forwarded: false };
  }

  const client = await import('@/lib/orchestration/inngest-client').then((m) =>
    m.getInngestClient(),
  );
  await client.send({ name: mapped.name, data: mapped.data });

  return { forwarded: true, inngestEventName: mapped.name };
}

/**
 * Background consumer: reads 003 Redis marketing stream → forwards mapped events to Inngest.
 * Failures log + retry with backoff; never throws to crash the worker process.
 */
export async function startRedisToInngestBridge(
  options: StartRedisToInngestBridgeOptions,
): Promise<void> {
  const log =
    options.log ??
    ((message, meta) => {
      console.info(`[redis-inngest-bridge] ${message}`, meta ?? {});
    });

  const config = resolveRedisToInngestBridgeConfig(options.config);
  const bridgeGroup = options.bridgeConsumerGroup ?? DEFAULT_INNGEST_BRIDGE_CONSUMER_GROUP;
  const streamKeys =
    config.redisStreamKey === DEFAULT_REDIS_STREAM_KEY
      ? DEFAULT_REDIS_SHARDED_STREAM_KEYS
      : [config.redisStreamKey];
  const consumerName = `inngest-bridge-${process.pid}`;
  let running = true;
  let backoffMs = 1000;

  for (const streamKey of streamKeys) {
    try {
      await options.redis.xgroup('CREATE', streamKey, bridgeGroup, '$', 'MKSTREAM');
    } catch {
      // Group already exists
    }
  }

  const inngestClient = getInngestClient();
  const inngestStub = isInngestStubClient();
  if (inngestStub) {
    log('inngest_stub_mode', {
      hint: 'Install inngest + set INNGEST_EVENT_KEY — events will log locally until configured',
    });
  }

  log('started', {
    streams: streamKeys,
    bridgeConsumerGroup: bridgeGroup,
    inngestStub,
  });

  while (running) {
    try {
      const results = (await options.redis.xreadgroup(
        'GROUP',
        bridgeGroup,
        consumerName,
        'COUNT',
        10,
        'BLOCK',
        BRIDGE_BLOCK_MS,
        'STREAMS',
        ...streamKeys.flatMap((key) => [key, '>']),
      )) as Array<[string, Array<[string, string[]]>]> | null;

      backoffMs = 1000;

      if (!results) {
        continue;
      }

      for (const [streamKey, messages] of results) {
        for (const [messageId, fields] of messages) {
          try {
            const event = parseStreamFieldsToMarketingEvent(fields);
            if (!event) {
              await options.redis.xack(streamKey, bridgeGroup, messageId);
              continue;
            }

            const forwardResult = await forwardRedisEventToInngest(event, config);
            if (forwardResult.forwarded) {
              log('event_forwarded', {
                stream: streamKey,
                sourceType: event.type,
                inngestEvent: forwardResult.inngestEventName,
                eventId: event.id,
              });
            }

            await options.redis.xack(streamKey, bridgeGroup, messageId);
          } catch (messageErr) {
            const message =
              messageErr instanceof Error ? messageErr.message : String(messageErr);
            log('message_forward_failed', { stream: streamKey, messageId, error: message });
            try {
              await options.redis.xack(streamKey, bridgeGroup, messageId);
            } catch {
              // ignore ack failure
            }
          }
        }
      }
    } catch (pollErr) {
      const message = pollErr instanceof Error ? pollErr.message : String(pollErr);
      log('poll_error_retry', { error: message, backoffMs });
      await sleep(backoffMs);
      backoffMs = Math.min(backoffMs * 2, BRIDGE_MAX_BACKOFF_MS);
    }
  }
}

export const redisToInngestBridgeUtils = {
  resolveRedisToInngestBridgeConfig,
  mapRedisMarketingEventToInngest,
  forwardRedisEventToInngest,
  startRedisToInngestBridge,
  parseStreamFieldsToMarketingEvent,
};
