import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  MarketingEventTypes,
  createInMemoryMarketingEventBusTransport,
  createMarketingEventBus,
} from '@/lib/events/marketing-event-bus';

describe('marketing-event-bus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('publishes typed events with envelope metadata via in-memory transport', async () => {
    const received: Array<{ type: string; workspaceId: string; payload: Record<string, unknown> }> =
      [];
    const transport = createInMemoryMarketingEventBusTransport();
    const bus = createMarketingEventBus({ transport });

    await bus.subscribe(async (event) => {
      received.push({
        type: event.type,
        workspaceId: event.workspaceId,
        payload: event.payload,
      });
    });

    const result = await bus.publish({
      type: MarketingEventTypes.COMPETITOR_PRICE_CHANGE,
      workspaceId: 'ws-123',
      payload: { competitor: 'Vista', change: '-15%' },
      idempotencyKey: 'evt-001',
    });

    expect(result).toEqual({ published: true, duplicate: false });
    expect(received).toHaveLength(1);
    expect(received[0].type).toBe(MarketingEventTypes.COMPETITOR_PRICE_CHANGE);
    expect(received[0].workspaceId).toBe('ws-123');
    expect(received[0].payload).toEqual({ competitor: 'Vista', change: '-15%' });
  });

  it('rejects duplicate idempotency keys without re-publishing', async () => {
    const transport = createInMemoryMarketingEventBusTransport();
    const bus = createMarketingEventBus({ transport });
    let handlerCalls = 0;

    await bus.subscribe(async () => {
      handlerCalls += 1;
    });

    const input = {
      type: MarketingEventTypes.VIRAL_SPIKE,
      workspaceId: 'ws-456',
      payload: { topic: 'ai-marketing' },
      idempotencyKey: 'dup-key',
    };

    const first = await bus.publish(input);
    const second = await bus.publish(input);

    expect(first.published).toBe(true);
    expect(second).toEqual({ published: false, duplicate: true });
    expect(handlerCalls).toBe(1);
  });

  it('exposes all six PRD marketing event types', () => {
    expect(Object.values(MarketingEventTypes)).toEqual([
      'marketing.competitor.price_change',
      'marketing.platform.algorithm_update',
      'marketing.trend.viral_spike',
      'marketing.budget.threshold_hit',
      'marketing.channel.suspended',
      'marketing.campaign.underperforming',
    ]);
  });
});
