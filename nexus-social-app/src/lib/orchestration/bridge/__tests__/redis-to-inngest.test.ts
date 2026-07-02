import { describe, expect, it } from 'vitest';
import {
  mapRedisMarketingEventToInngest,
  resolveRedisToInngestBridgeConfig,
} from '@/lib/orchestration/bridge/redis-to-inngest';
import type { MarketingEvent } from '@/lib/events/marketing-event-bus';

describe('redis-to-inngest bridge', () => {
  it('uses configurable stream key from env defaults', () => {
    const config = resolveRedisToInngestBridgeConfig();
    expect(config.redisStreamKey).toBeTruthy();
    expect(config.redisConsumerGroup).toBeTruthy();
  });

  it('maps underperforming 003 event to ai-cmo campaign.underperforming', () => {
    const event: MarketingEvent = {
      id: 'evt-1',
      type: 'marketing.campaign.underperforming',
      workspaceId: '550e8400-e29b-41d4-a716-446655440000',
      payload: { campaignId: '7c9e6679-7425-40de-944b-e07fc1f90ae7' },
      idempotencyKey: 'idem-1',
      occurredAt: new Date().toISOString(),
    };

    const mapped = mapRedisMarketingEventToInngest(event);
    expect(mapped?.name).toBe('ai-cmo/campaign.underperforming');
    expect(mapped?.data.trigger).toBe('underperforming');
  });

  it('returns null for unmapped 003 events', () => {
    const event: MarketingEvent = {
      id: 'evt-2',
      type: 'marketing.trend.viral_spike',
      workspaceId: '550e8400-e29b-41d4-a716-446655440000',
      payload: {},
      idempotencyKey: 'idem-2',
      occurredAt: new Date().toISOString(),
    };

    expect(mapRedisMarketingEventToInngest(event)).toBeNull();
  });
});
