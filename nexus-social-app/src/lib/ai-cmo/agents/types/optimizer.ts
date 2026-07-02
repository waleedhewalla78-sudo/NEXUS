/**
 * Feature 004 Phase 2 — Optimizer agent types (L9 learning loop proposals).
 */

import { z } from 'zod';

export const proposedLearningSchema = z.object({
  learningType: z.enum(['content_pattern', 'timing', 'audience', 'channel', 'tone']),
  context: z.record(z.string(), z.unknown()),
  action: z.record(z.string(), z.unknown()),
  outcome: z.record(z.string(), z.unknown()),
  roiImpact: z.number(),
  confidence: z.number().min(0).max(1),
});

export type ProposedLearning = z.infer<typeof proposedLearningSchema>;

export const varianceAnalysisSchema = z.record(
  z.string(),
  z.object({
    expected: z.number(),
    actual: z.number(),
    deltaPct: z.number().optional(),
  }),
);

export type VarianceAnalysis = z.infer<typeof varianceAnalysisSchema>;

export const strategyDeltaSchema = z.object({
  channels: z.array(z.string()).optional(),
  keyMessages: z.array(z.string()).optional(),
  budgetShiftPct: z.number().optional(),
  rationale: z.string().optional(),
});

export type StrategyDelta = z.infer<typeof strategyDeltaSchema>;

export const optimizerOutputSchema = z.object({
  campaignId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  diagnosis: z.string(),
  variance: varianceAnalysisSchema,
  learnings: z.array(proposedLearningSchema),
  strategyDelta: strategyDeltaSchema.optional(),
  replanRecommended: z.boolean(),
  llmStubbed: z.boolean(),
});

export type OptimizerOutput = z.infer<typeof optimizerOutputSchema>;

export type OptimizerRunInput = {
  workspaceId: string;
  campaignId: string;
  expectedKpis?: Record<string, number>;
};

/** @deprecated Use ProposedLearning */
export type OptimizerLearning = ProposedLearning;

/** @deprecated Use OptimizerOutput */
export type OptimizerResult = OptimizerOutput;
