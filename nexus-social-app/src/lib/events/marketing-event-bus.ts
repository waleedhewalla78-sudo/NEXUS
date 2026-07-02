/**
 * Typed marketing events for AI CMO orchestration.
 * Transport: Redis Streams (see clarifications CL-001).
 */

import {
  allMarketingStreamShardKeys,
  marketingStreamKeyForWorkspace,
} from '@/lib/events/marketing-stream-sharding';

export const MarketingEventTypes = {
  COMPETITOR_PRICE_CHANGE: 'marketing.competitor.price_change',
  ALGORITHM_UPDATE: 'marketing.platform.algorithm_update',
  VIRAL_SPIKE: 'marketing.trend.viral_spike',
  BUDGET_EXHAUSTED: 'marketing.budget.threshold_hit',
  AD_ACCOUNT_SUSPENDED: 'marketing.channel.suspended',
  CAMPAIGN_PERFORMING_BELOW: 'marketing.campaign.underperforming',
} as const;

export type MarketingEventType =
  (typeof MarketingEventTypes)[keyof typeof MarketingEventTypes];

export type MarketingEventPayload = Record<string, unknown>;

export type MarketingEvent = {
  id: string;
  type: MarketingEventType;
  workspaceId: string;
  payload: MarketingEventPayload;
  idempotencyKey: string;
  occurredAt: string;
};

export type PublishMarketingEventInput = {
  type: MarketingEventType;
  workspaceId: string;
  payload: MarketingEventPayload;
  idempotencyKey: string;
};

export type MarketingEventHandler = (event: MarketingEvent) => Promise<void>;

export type MarketingEventBusTransport = {
  publish: (event: MarketingEvent) => Promise<boolean>;
  subscribe: (handler: MarketingEventHandler) => Promise<() => void>;
  checkIdempotency: (key: string) => Promise<boolean>;
  markIdempotency: (key: string, ttlSeconds?: number) => Promise<void>;
};

const IDEMPOTENCY_PREFIX = 'marketing:idempotency:';
const STREAM_KEY = process.env.MARKETING_EVENTS_STREAM_KEY ?? 'marketing:events';
const CONSUMER_GROUP = 'marketing:workers';

function buildEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/** In-memory transport for unit tests and Redis-less dev. */
export function createInMemoryMarketingEventBusTransport(): MarketingEventBusTransport {
  const idempotency = new Set<string>();
  const handlers = new Set<MarketingEventHandler>();

  return {
    async checkIdempotency(key) {
      return idempotency.has(key);
    },
    async markIdempotency(key) {
      idempotency.add(key);
    },
    async publish(event) {
      for (const handler of handlers) {
        await handler(event);
      }
      return true;
    },
    async subscribe(handler) {
      handlers.add(handler);
      return async () => {
        handlers.delete(handler);
      };
    },
  };
}

/** Redis Streams transport using ioredis. */
export function createRedisMarketingEventBusTransport(
  redis: import('ioredis').default | null,
): MarketingEventBusTransport {
  if (!redis) {
    return createInMemoryMarketingEventBusTransport();
  }

  return {
    async checkIdempotency(key) {
      const existing = await redis.get(`${IDEMPOTENCY_PREFIX}${key}`);
      return existing === '1';
    },
    async markIdempotency(key, ttlSeconds = 86400) {
      await redis.set(`${IDEMPOTENCY_PREFIX}${key}`, '1', 'EX', ttlSeconds);
    },
    async publish(event) {
      const streamKey = marketingStreamKeyForWorkspace(event.workspaceId);
      await redis.xadd(
        streamKey,
        '*',
        'id',
        event.id,
        'type',
        event.type,
        'workspaceId',
        event.workspaceId,
        'payload',
        JSON.stringify(event.payload),
        'idempotencyKey',
        event.idempotencyKey,
        'occurredAt',
        event.occurredAt,
      );
      return true;
    },
    async subscribe(handler) {
      const streamKeys = allMarketingStreamShardKeys();
      for (const streamKey of streamKeys) {
        try {
          await redis.xgroup('CREATE', streamKey, CONSUMER_GROUP, '$', 'MKSTREAM');
        } catch {
          // Group may already exist
        }
      }

      let running = true;
      const consumerName = `worker-${process.pid}`;

      const poll = async () => {
        while (running) {
          const results = await redis.xreadgroup(
            'GROUP',
            CONSUMER_GROUP,
            consumerName,
            'COUNT',
            10,
            'BLOCK',
            2000,
            'STREAMS',
            ...streamKeys.flatMap((key) => [key, '>']),
          );

          if (!results) continue;

          for (const streamResult of results as Array<[string, Array<[string, string[]]>]>) {
            const [streamKey, messages] = streamResult;
            for (const [messageId, fields] of messages) {
              const parsed = parseStreamFields(fields);
              if (parsed) await handler(parsed);
              await redis.xack(streamKey, CONSUMER_GROUP, messageId);
            }
          }
        }
      };

      void poll().catch((err) => {
        console.error('[marketing-event-bus] consumer error:', err);
      });

      return async () => {
        running = false;
      };
    },
  };
}

function parseStreamFields(fields: string[]): MarketingEvent | null {
  const map: Record<string, string> = {};
  for (let i = 0; i < fields.length; i += 2) {
    map[fields[i]] = fields[i + 1];
  }
  if (!map.type || !map.workspaceId || !map.idempotencyKey) return null;
  let payload: MarketingEventPayload = {};
  try {
    payload = JSON.parse(map.payload ?? '{}') as MarketingEventPayload;
  } catch {
    payload = {};
  }
  return {
    id: map.id ?? buildEventId(),
    type: map.type as MarketingEventType,
    workspaceId: map.workspaceId,
    payload,
    idempotencyKey: map.idempotencyKey,
    occurredAt: map.occurredAt ?? new Date().toISOString(),
  };
}

export class MarketingEventBus {
  constructor(private readonly transport: MarketingEventBusTransport) {}

  async publish(input: PublishMarketingEventInput): Promise<{ published: boolean; duplicate: boolean }> {
    const duplicate = await this.transport.checkIdempotency(input.idempotencyKey);
    if (duplicate) {
      return { published: false, duplicate: true };
    }

    const event: MarketingEvent = {
      id: buildEventId(),
      type: input.type,
      workspaceId: input.workspaceId,
      payload: input.payload,
      idempotencyKey: input.idempotencyKey,
      occurredAt: new Date().toISOString(),
    };

    await this.transport.markIdempotency(input.idempotencyKey);
    await this.transport.publish(event);
    return { published: true, duplicate: false };
  }

  async subscribe(handler: MarketingEventHandler): Promise<() => void> {
    return this.transport.subscribe(handler);
  }
}

export function createMarketingEventBus(options?: {
  transport?: MarketingEventBusTransport;
  redis?: import('ioredis').default | null;
}): MarketingEventBus {
  const transport =
    options?.transport ??
    (options?.redis !== undefined
      ? createRedisMarketingEventBusTransport(options.redis)
      : createInMemoryMarketingEventBusTransport());
  return new MarketingEventBus(transport);
}

export const marketingEventBusUtils = {
  MarketingEventTypes,
  STREAM_KEY,
  CONSUMER_GROUP,
  createInMemoryMarketingEventBusTransport,
  createRedisMarketingEventBusTransport,
};
