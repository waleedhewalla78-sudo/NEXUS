/**
 * Dead-letter queue for failed marketing event processing (Phase B — Redis DLQ).
 */

import type Redis from 'ioredis';

export const MARKETING_DLQ_STREAM = 'marketing:events:dlq';

export type DlqEntry = {
  originalEventId: string;
  eventType: string;
  workspaceId: string;
  payload: Record<string, unknown>;
  idempotencyKey: string;
  error: string;
  failedAt: string;
  attemptCount: number;
};

export async function pushToMarketingDlq(redis: Redis, entry: DlqEntry): Promise<void> {
  await redis.xadd(
    MARKETING_DLQ_STREAM,
    '*',
    'originalEventId',
    entry.originalEventId,
    'eventType',
    entry.eventType,
    'workspaceId',
    entry.workspaceId,
    'payload',
    JSON.stringify(entry.payload),
    'idempotencyKey',
    entry.idempotencyKey,
    'error',
    entry.error,
    'failedAt',
    entry.failedAt,
    'attemptCount',
    String(entry.attemptCount),
  );
}

export async function getMarketingDlqLength(redis: Redis): Promise<number> {
  return redis.xlen(MARKETING_DLQ_STREAM);
}

export const marketingEventDlqUtils = {
  MARKETING_DLQ_STREAM,
  pushToMarketingDlq,
  getMarketingDlqLength,
};
