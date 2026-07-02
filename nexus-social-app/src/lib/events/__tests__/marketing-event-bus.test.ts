import { describe, expect, it, vi } from 'vitest';
import {
  MarketingEventBus,
  MarketingEventTypes,
  createInMemoryMarketingEventBusTransport,
  createMarketingEventBus,
} from '@/lib/events/marketing-event-bus';

describe('MarketingEventBus', () => {
  it('publishes typed events with idempotency', async () => {
    const transport = createInMemoryMarketingEventBusTransport();
    const received: string[] = [];
    await transport.subscribe(async (event) => {
      received.push(event.type);
    });

    const bus = new MarketingEventBus(transport);
    const first = await bus.publish({
      type: MarketingEventTypes.VIRAL_SPIKE,
      workspaceId: '11111111-1111-1111-1111-111111111111',
      payload: { trend: 'ai-marketing' },
      idempotencyKey: 'idem-1',
    });

    const duplicate = await bus.publish({
      type: MarketingEventTypes.VIRAL_SPIKE,
      workspaceId: '11111111-1111-1111-1111-111111111111',
      payload: { trend: 'ai-marketing' },
      idempotencyKey: 'idem-1',
    });

    expect(first).toEqual({ published: true, duplicate: false });
    expect(duplicate).toEqual({ published: false, duplicate: true });
    expect(received).toHaveLength(1);
    expect(received[0]).toBe(MarketingEventTypes.VIRAL_SPIKE);
  });

  it('covers all Sprint 12 marketing event types', () => {
    expect(Object.keys(MarketingEventTypes)).toHaveLength(6);
    expect(MarketingEventTypes.COMPETITOR_PRICE_CHANGE).toBe('marketing.competitor.price_change');
    expect(MarketingEventTypes.CAMPAIGN_PERFORMING_BELOW).toBe('marketing.campaign.underperforming');
  });

  it('defaults to in-memory transport', async () => {
    const bus = createMarketingEventBus();
    const result = await bus.publish({
      type: MarketingEventTypes.BUDGET_EXHAUSTED,
      workspaceId: '22222222-2222-2222-2222-222222222222',
      payload: { threshold: 0.9 },
      idempotencyKey: 'idem-2',
    });
    expect(result.published).toBe(true);
  });
});

describe('createInMemoryMarketingEventBusTransport idempotency', () => {
  it('tracks idempotency keys independently of publish', async () => {
    const transport = createInMemoryMarketingEventBusTransport();
    expect(await transport.checkIdempotency('k1')).toBe(false);
    await transport.markIdempotency('k1');
    expect(await transport.checkIdempotency('k1')).toBe(true);
  });
});
