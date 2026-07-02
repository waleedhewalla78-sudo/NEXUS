/**
 * Feature 004 Phase 7 — Intelligence agent types (Radar, Quant, Sentinel).
 */

import { z } from 'zod';
import { agentRunInputSchema } from '@/lib/ai-cmo/agents/types/base';

export const externalSignalSchema = z.object({
  source: z.string(),
  headline: z.string(),
  summary: z.string().optional(),
  url: z.string().optional(),
  detectedAt: z.string(),
  relevanceScore: z.number().min(0).max(1).optional(),
});

export type ExternalSignal = z.infer<typeof externalSignalSchema>;

export const radarRunInputSchema = agentRunInputSchema.extend({
  signals: z.array(externalSignalSchema).default([]),
  industry: z.string().optional(),
});

export type RadarRunInput = z.infer<typeof radarRunInputSchema>;

export const detectedSignalProposalSchema = z.object({
  signalId: z.string(),
  headline: z.string(),
  relevanceScore: z.number(),
  recommendedAction: z.string(),
  topics: z.array(z.string()),
});

export type DetectedSignalProposal = z.infer<typeof detectedSignalProposalSchema>;

export const aggregatedAnalyticsSchema = z.object({
  impressions: z.number().nonnegative().default(0),
  clicks: z.number().nonnegative().default(0),
  conversions: z.number().nonnegative().default(0),
  engagementRate: z.number().min(0).max(1).optional(),
  periodDays: z.number().int().positive().default(7),
});

export type AggregatedAnalytics = z.infer<typeof aggregatedAnalyticsSchema>;

export const quantRunInputSchema = agentRunInputSchema.extend({
  analytics: aggregatedAnalyticsSchema,
  baseline: aggregatedAnalyticsSchema.optional(),
});

export type QuantRunInput = z.infer<typeof quantRunInputSchema>;

export const quantInsightProposalSchema = z.object({
  summary: z.string(),
  ctr: z.number(),
  conversionRate: z.number(),
  trend: z.enum(['up', 'down', 'flat']),
  brainHints: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});

export type QuantInsightProposal = z.infer<typeof quantInsightProposalSchema>;

export const metricAnomalySchema = z.object({
  metric: z.string(),
  currentValue: z.number(),
  baselineValue: z.number(),
  dropPct: z.number(),
  detectedAt: z.string(),
});

export type MetricAnomaly = z.infer<typeof metricAnomalySchema>;

export const sentinelRunInputSchema = agentRunInputSchema.extend({
  campaignId: z.string().uuid().optional(),
  anomalies: z.array(metricAnomalySchema).default([]),
  thresholdPct: z.number().positive().default(30),
});

export type SentinelRunInput = z.infer<typeof sentinelRunInputSchema>;

export const anomalyProposalSchema = z.object({
  anomalyId: z.string(),
  metric: z.string(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  dropPct: z.number(),
  recommendedAction: z.string(),
});

export type AnomalyProposal = z.infer<typeof anomalyProposalSchema>;
