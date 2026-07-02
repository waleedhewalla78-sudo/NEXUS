/**
 * Feature 004 Phase 2 — Outcome ingestion types (003 post_analytics → 004 outcomes).
 */

import { z } from 'zod';

export const ingestedOutcomeSchema = z.object({
  workspaceId: z.string().uuid(),
  campaignId: z.string().uuid(),
  contentPieceId: z.string().uuid().optional(),
  postId: z.string().uuid(),
  impressions: z.number().int().nonnegative(),
  clicks: z.number().int().nonnegative(),
  conversions: z.number().int().nonnegative(),
  leadsGenerated: z.number().int().nonnegative(),
  revenueAttributed: z.number().nonnegative(),
  cost: z.number().nonnegative(),
  roiRatio: z.number().nullable(),
  engagementRate: z.number().nullable().optional(),
  measuredAt: z.string(),
});

export type IngestedOutcome = z.infer<typeof ingestedOutcomeSchema>;

export type OutcomeIngestionResult = {
  processed: number;
  synced: number;
  updated: number;
  skipped: number;
  errors: number;
};

/** @deprecated Use OutcomeIngestionResult */
export type SyncOutcomesResult = OutcomeIngestionResult;

export type ContentPieceWithCampaign = {
  id: string;
  workspace_id: string;
  post_id: string;
  campaign_id: string | null;
};

export type PostAnalyticsAggregate = {
  impressions: number;
  clicks: number;
  conversions: number;
  engagement_rate: number | null;
};
