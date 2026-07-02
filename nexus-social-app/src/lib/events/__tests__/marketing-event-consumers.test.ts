import { describe, expect, it, vi } from 'vitest';
import {
  createUnderperformingCampaignHandler,
  createBudgetThresholdHandler,
} from '@/lib/events/marketing-event-consumers';
import { MarketingEventTypes } from '@/lib/events/marketing-event-bus';

describe('marketing event consumers', () => {
  it('handles underperforming campaign events', async () => {
    const triggerReplan = vi.fn();
    const handler = createUnderperformingCampaignHandler({ triggerReplan });

    await handler({
      id: 'evt-1',
      type: MarketingEventTypes.CAMPAIGN_PERFORMING_BELOW,
      workspaceId: 'ws-1',
      payload: { campaignId: 'camp-1', metric: 'ctr' },
      idempotencyKey: 'key-1',
      occurredAt: new Date().toISOString(),
    });

    expect(triggerReplan).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: 'ws-1', campaignId: 'camp-1' }),
    );
  });

  it('ignores unrelated event types in underperforming handler', async () => {
    const triggerReplan = vi.fn();
    const handler = createUnderperformingCampaignHandler({ triggerReplan });

    await handler({
      id: 'evt-2',
      type: MarketingEventTypes.VIRAL_SPIKE,
      workspaceId: 'ws-1',
      payload: {},
      idempotencyKey: 'key-2',
      occurredAt: new Date().toISOString(),
    });

    expect(triggerReplan).not.toHaveBeenCalled();
  });

  it('triggers replan on budget threshold at 90%+', async () => {
    const triggerReplan = vi.fn();
    const handler = createBudgetThresholdHandler({ triggerReplan });

    await handler({
      id: 'evt-3',
      type: MarketingEventTypes.BUDGET_EXHAUSTED,
      workspaceId: 'ws-1',
      payload: { spendPercent: 92 },
      idempotencyKey: 'key-3',
      occurredAt: new Date().toISOString(),
    });

    expect(triggerReplan).toHaveBeenCalledWith(
      expect.objectContaining({ reason: expect.stringContaining('92%') }),
    );
  });
});
