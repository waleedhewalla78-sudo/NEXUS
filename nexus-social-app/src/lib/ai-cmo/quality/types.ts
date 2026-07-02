/**
 * Feature 004 Phase 4 — LLM-as-Judge quality evaluation types.
 */

import { z } from 'zod';

export const evaluationDimensionsSchema = z.object({
  accuracy: z.number().min(0).max(1),
  brandAlignment: z.number().min(0).max(1),
  localization: z.number().min(0).max(1),
  uniqueness: z.number().min(0).max(1),
  eeat: z.number().min(0).max(1),
  engagement: z.number().min(0).max(1),
  platformCompliance: z.number().min(0).max(1),
  safety: z.number().min(0).max(1),
});

export type EvaluationDimensions = z.infer<typeof evaluationDimensionsSchema>;

export const autoRejectReasonSchema = z.enum([
  'HALLUCINATION',
  'OVERALL_SCORE_TOO_LOW',
  'LOCALIZATION_TOO_LOW',
  'ACCURACY_TOO_LOW',
  'PLATFORM_COMPLIANCE_TOO_LOW',
  'UNIQUENESS_TOO_LOW',
]);

export type AutoRejectReason = z.infer<typeof autoRejectReasonSchema>;

export type QualityEvaluationInput = {
  content: {
    caption: string;
    hashtags: string[];
    callToAction: string;
    platforms: string[];
    locale: string;
  };
  brandVoice?: {
    tone?: string;
    values?: string[];
    guidelines?: string;
  };
  planObjective?: string;
  existingCorpus?: string[];
  workspaceId?: string;
};

export type QualityEvaluationResult = {
  dimensions: EvaluationDimensions;
  overallScore: number;
  hallucinationFlag: boolean;
  autoRejected: boolean;
  rejectionReasons: AutoRejectReason[];
  requiresRevision: boolean;
  revisionFeedback?: string;
  shouldPublish: boolean;
  evaluatorModel: string;
  rawJudgeResponse?: string;
};

export const DIMENSION_WEIGHTS: Record<keyof EvaluationDimensions, number> = {
  accuracy: 0.15,
  brandAlignment: 0.15,
  localization: 0.12,
  uniqueness: 0.12,
  eeat: 0.13,
  engagement: 0.1,
  platformCompliance: 0.13,
  safety: 0.1,
};
