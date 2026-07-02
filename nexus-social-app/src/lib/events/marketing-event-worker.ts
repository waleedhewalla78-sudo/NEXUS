/**
 * Production worker integration for marketing event bus consumers (Phase B).
 */

import type Redis from 'ioredis';
import { createMarketingEventBus } from '@/lib/events/marketing-event-bus';
import { registerDefaultMarketingEventConsumers } from '@/lib/events/marketing-event-consumers';
import { pushToMarketingDlq } from '@/lib/events/marketing-event-dlq';
import { enqueueCampaignReplanJob } from '@/lib/ai-cmo/campaign-job-store';

const MAX_HANDLER_ATTEMPTS = 3;

export type StartMarketingEventConsumerOptions = {
  redis: Redis;
  log?: (message: string, meta?: Record<string, unknown>) => void;
};

export async function startMarketingEventConsumer(options: StartMarketingEventConsumerOptions): Promise<void> {
  const log = options.log ?? ((msg, meta) => console.info(`[marketing-worker] ${msg}`, meta ?? {}));
  const bus = createMarketingEventBus({ redis: options.redis });

  const attemptCounts = new Map<string, number>();

  await registerDefaultMarketingEventConsumers(
    async (handler) => {
      return bus.subscribe(async (event) => {
        const key = event.idempotencyKey;
        const attempts = (attemptCounts.get(key) ?? 0) + 1;
        attemptCounts.set(key, attempts);

        try {
          await handler(event);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          log('handler_failed', { eventId: event.id, type: event.type, attempts, error: message });

          if (attempts >= MAX_HANDLER_ATTEMPTS) {
            await pushToMarketingDlq(options.redis, {
              originalEventId: event.id,
              eventType: event.type,
              workspaceId: event.workspaceId,
              payload: event.payload,
              idempotencyKey: event.idempotencyKey,
              error: message,
              failedAt: new Date().toISOString(),
              attemptCount: attempts,
            });
            attemptCounts.delete(key);
          } else {
            throw err;
          }
        }
      });
    },
    {
      log,
      triggerReplan: async ({ workspaceId, campaignId, reason }) => {
        await enqueueCampaignReplanJob({
          redis: options.redis,
          workspaceId,
          campaignId,
          reason,
        });
        log('replan_enqueued', { workspaceId, campaignId, reason });
      },
    },
  );

  log('consumer_started');
}

export const marketingEventWorkerUtils = {
  startMarketingEventConsumer,
};
