/**
 * Feature 004 — Inngest event types (L3 orchestration).
 * Namespaced with `ai-cmo/` prefix — must not collide with 003 Redis marketing bus or publish events.
 */

import { z } from 'zod';

export const AI_CMO_INNGEST_EVENT_NAMES = {
  CAMPAIGN_REQUESTED: 'ai-cmo/campaign.requested',
  CAMPAIGN_COMPLETED: 'ai-cmo/campaign.completed',
  CAMPAIGN_FAILED: 'ai-cmo/campaign.failed',
  REPLAN_REQUESTED: 'ai-cmo/replan.requested',
  CAMPAIGN_UNDERPERFORMING: 'ai-cmo/campaign.underperforming',
  ANALYTICS_SYNCED: 'ai-cmo/analytics.synced',
  SIGNAL_DETECTED: 'ai-cmo/signal.detected',
  ANOMALY_DETECTED: 'ai-cmo/anomaly.detected',
} as const;

export type AiCmoInngestEventName =
  (typeof AI_CMO_INNGEST_EVENT_NAMES)[keyof typeof AI_CMO_INNGEST_EVENT_NAMES];

const uuid = z.string().uuid();
const isoTimestamp = z.string().datetime({ offset: true }).or(z.string().min(1));

export const aiCmoCampaignRequestedEventSchema = z.object({
  name: z.literal(AI_CMO_INNGEST_EVENT_NAMES.CAMPAIGN_REQUESTED),
  data: z.object({
    jobId: z.string().uuid(),
    workspaceId: uuid,
    userId: z.string().min(1),
    campaignId: uuid.optional(),
    objective: z.string().min(1),
    brandId: uuid.optional().nullable(),
    brandName: z.string().optional(),
    locale: z.string().optional(),
    persona: z.enum(['executive', 'operator', 'compliance']).optional(),
    targetAccountId: z.string().min(1).optional(),
    workspaceDifyApiKey: z.string().optional().nullable(),
    idempotencyKey: z.string().min(8),
    requestedAt: isoTimestamp,
  }),
});

export type AiCmoCampaignRequestedEvent = z.infer<typeof aiCmoCampaignRequestedEventSchema>;

export const aiCmoCampaignCompletedEventSchema = z.object({
  name: z.literal(AI_CMO_INNGEST_EVENT_NAMES.CAMPAIGN_COMPLETED),
  data: z.object({
    workspaceId: uuid,
    campaignId: uuid,
    jobId: z.string().min(1),
    status: z.enum(['published', 'approval_required', 'rejected', 'policy_blocked']),
    completedAt: isoTimestamp,
  }),
});

export type AiCmoCampaignCompletedEvent = z.infer<typeof aiCmoCampaignCompletedEventSchema>;

export const aiCmoCampaignFailedEventSchema = z.object({
  name: z.literal(AI_CMO_INNGEST_EVENT_NAMES.CAMPAIGN_FAILED),
  data: z.object({
    workspaceId: uuid,
    campaignId: uuid,
    jobId: z.string().min(1),
    error: z.string().min(1),
    failedAt: isoTimestamp,
  }),
});

export type AiCmoCampaignFailedEvent = z.infer<typeof aiCmoCampaignFailedEventSchema>;

export const aiCmoReplanRequestedEventSchema = z.object({
  name: z.literal(AI_CMO_INNGEST_EVENT_NAMES.REPLAN_REQUESTED),
  data: z.object({
    workspaceId: uuid,
    campaignId: z.string().min(1),
    trigger: z.enum(['underperforming', 'budget_threshold', 'manual']),
    sourceEventId: z.string().optional(),
    requestedAt: isoTimestamp,
  }),
});

export const aiCmoAnalyticsSyncedEventSchema = z.object({
  name: z.literal(AI_CMO_INNGEST_EVENT_NAMES.ANALYTICS_SYNCED),
  data: z.object({
    workspaceId: uuid,
    postId: z.string().optional(),
    campaignId: uuid.optional(),
    syncedAt: isoTimestamp,
    metrics: z.record(z.string(), z.unknown()).optional(),
  }),
});

export type AiCmoAnalyticsSyncedEvent = z.infer<typeof aiCmoAnalyticsSyncedEventSchema>;

export const aiCmoSignalDetectedEventSchema = z.object({
  name: z.literal(AI_CMO_INNGEST_EVENT_NAMES.SIGNAL_DETECTED),
  data: z.object({
    workspaceId: uuid,
    campaignId: uuid.optional(),
    signalId: z.string().min(1),
    headline: z.string(),
    relevanceScore: z.number().min(0).max(1),
    detectedAt: isoTimestamp,
  }),
});

export type AiCmoSignalDetectedEvent = z.infer<typeof aiCmoSignalDetectedEventSchema>;

export const aiCmoAnomalyDetectedEventSchema = z.object({
  name: z.literal(AI_CMO_INNGEST_EVENT_NAMES.ANOMALY_DETECTED),
  data: z.object({
    workspaceId: uuid,
    campaignId: uuid.optional(),
    anomalyId: z.string().min(1),
    metric: z.string(),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    dropPct: z.number(),
    detectedAt: isoTimestamp,
  }),
});

export type AiCmoAnomalyDetectedEvent = z.infer<typeof aiCmoAnomalyDetectedEventSchema>;

export type AiCmoReplanRequestedEvent = z.infer<typeof aiCmoReplanRequestedEventSchema>;

export const aiCmoCampaignUnderperformingEventSchema = z.object({
  name: z.literal(AI_CMO_INNGEST_EVENT_NAMES.CAMPAIGN_UNDERPERFORMING),
  data: z.object({
    workspaceId: uuid,
    campaignId: z.string().min(1),
    trigger: z.literal('underperforming'),
    sourceEventId: z.string().optional(),
    requestedAt: isoTimestamp,
  }),
});

export type AiCmoCampaignUnderperformingEvent = z.infer<
  typeof aiCmoCampaignUnderperformingEventSchema
>;

export const aiCmoInngestEventSchema = z.discriminatedUnion('name', [
  aiCmoCampaignRequestedEventSchema,
  aiCmoCampaignCompletedEventSchema,
  aiCmoCampaignFailedEventSchema,
  aiCmoReplanRequestedEventSchema,
  aiCmoCampaignUnderperformingEventSchema,
  aiCmoAnalyticsSyncedEventSchema,
  aiCmoSignalDetectedEventSchema,
  aiCmoAnomalyDetectedEventSchema,
]);

export type AiCmoInngestEvent = z.infer<typeof aiCmoInngestEventSchema>;

export function parseAiCmoInngestEvent(payload: unknown): AiCmoInngestEvent {
  return aiCmoInngestEventSchema.parse(payload);
}

export function isAiCmoNamespacedEventName(name: string): boolean {
  return name.startsWith('ai-cmo/');
}
