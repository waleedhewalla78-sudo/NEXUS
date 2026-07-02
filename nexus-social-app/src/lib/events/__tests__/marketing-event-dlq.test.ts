import { describe, expect, it, vi } from 'vitest';
import {
  MARKETING_DLQ_STREAM,
  pushToMarketingDlq,
  getMarketingDlqLength,
} from '@/lib/events/marketing-event-dlq';

describe('marketing-event-dlq', () => {
  it('pushes failed events to Redis stream', async () => {
    const redis = {
      xadd: vi.fn().mockResolvedValue('1-0'),
      xlen: vi.fn().mockResolvedValue(3),
    };

    await pushToMarketingDlq(redis as never, {
      originalEventId: 'evt-1',
      eventType: 'marketing.campaign.underperforming',
      workspaceId: '550e8400-e29b-41d4-a716-446655440000',
      payload: { campaignId: 'camp-1' },
      idempotencyKey: 'key-1',
      error: 'handler failed',
      failedAt: new Date().toISOString(),
      attemptCount: 3,
    });

    expect(redis.xadd).toHaveBeenCalledWith(
      MARKETING_DLQ_STREAM,
      '*',
      'originalEventId',
      'evt-1',
      'eventType',
      'marketing.campaign.underperforming',
      'workspaceId',
      '550e8400-e29b-41d4-a716-446655440000',
      'payload',
      JSON.stringify({ campaignId: 'camp-1' }),
      'idempotencyKey',
      'key-1',
      'error',
      'handler failed',
      'failedAt',
      expect.any(String),
      'attemptCount',
      '3',
    );
  });

  it('returns DLQ stream length', async () => {
    const redis = { xlen: vi.fn().mockResolvedValue(5) };
    const length = await getMarketingDlqLength(redis as never);
    expect(length).toBe(5);
  });
});
