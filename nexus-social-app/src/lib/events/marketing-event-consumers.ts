/**
 * Stub event bus consumers for Sprint 13 (PRD Module Q).
 * Handlers log intent and enqueue orchestration — full Inngest wiring deferred.
 */

import {
  MarketingEventTypes,
  type MarketingEvent,
  type MarketingEventHandler,
} from '@/lib/events/marketing-event-bus';

export type MarketingEventConsumerContext = {
  triggerReplan?: (params: { workspaceId: string; campaignId?: string; reason: string }) => Promise<void>;
  log?: (message: string, meta?: Record<string, unknown>) => void;
};

export function createUnderperformingCampaignHandler(
  ctx: MarketingEventConsumerContext = {},
): MarketingEventHandler {
  const log = ctx.log ?? ((msg, meta) => console.info(`[marketing-consumer] ${msg}`, meta ?? {}));

  return async (event: MarketingEvent) => {
    if (event.type !== MarketingEventTypes.CAMPAIGN_PERFORMING_BELOW) return;

    const campaignId = typeof event.payload.campaignId === 'string' ? event.payload.campaignId : undefined;
    const reason = `Campaign underperforming: ${String(event.payload.metric ?? 'unknown metric')}`;

    log('underperforming_campaign', { workspaceId: event.workspaceId, campaignId, reason });

    if (ctx.triggerReplan) {
      await ctx.triggerReplan({ workspaceId: event.workspaceId, campaignId, reason });
    }
  };
}

export function createBudgetThresholdHandler(
  ctx: MarketingEventConsumerContext = {},
): MarketingEventHandler {
  const log = ctx.log ?? ((msg, meta) => console.info(`[marketing-consumer] ${msg}`, meta ?? {}));

  return async (event: MarketingEvent) => {
    if (event.type !== MarketingEventTypes.BUDGET_EXHAUSTED) return;

    const spendPct = event.payload.spendPercent;
    log('budget_threshold', { workspaceId: event.workspaceId, spendPct });

    if (ctx.triggerReplan && typeof spendPct === 'number' && spendPct >= 90) {
      await ctx.triggerReplan({
        workspaceId: event.workspaceId,
        reason: `Budget ${spendPct}% consumed — pause or reallocate`,
      });
    }
  };
}

export function registerDefaultMarketingEventConsumers(
  subscribe: (handler: MarketingEventHandler) => Promise<() => void>,
  ctx?: MarketingEventConsumerContext,
): Promise<() => Promise<void>> {
  const handlers = [
    createUnderperformingCampaignHandler(ctx),
    createBudgetThresholdHandler(ctx),
  ];

  const unsubscribes: Array<() => void | Promise<void>> = [];

  return subscribe(async (event) => {
    for (const handler of handlers) {
      await handler(event);
    }
  }).then((unsub) => {
    unsubscribes.push(unsub);
    return async () => {
      for (const u of unsubscribes) {
        await u();
      }
    };
  });
}

export const marketingEventConsumersUtils = {
  createUnderperformingCampaignHandler,
  createBudgetThresholdHandler,
  registerDefaultMarketingEventConsumers,
};
