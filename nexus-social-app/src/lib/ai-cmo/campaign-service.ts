/**
 * AI CMO campaign writes via SoR reconciler (PRD Module P).
 * All agent outputs persist through syncToSoR — never direct Supabase from agents.
 */

import { SorTableNames, type SyncToSoRResult } from '@/lib/ai-cmo/types/reconciler';
import { securePatchSoR, secureSyncToSoR } from '@/lib/ai-cmo/utils/secure-reconciler-writer';
import type { CreatedContent } from '@/lib/ai-cmo/creator-agent';
import type { QualityEvaluationResult } from '@/lib/ai-cmo/quality/types';
import type { StrategicPlan } from '@/lib/ai-cmo/strategic-brain';
import type { QualityScore } from '@/lib/quality/content-quality-engine';
import {
  linkCampaignPostViaReconciler,
  type LinkCampaignPostInput,
  type LinkPostResult,
} from '@/lib/ai-cmo/services/campaign-post-linker';

export type CreateCampaignInput = {
  workspaceId: string;
  userId: string;
  name: string;
  brandId?: string | null;
  objective: string | Record<string, unknown>;
};

export type PersistContentPieceInput = {
  workspaceId: string;
  userId: string;
  campaignId: string;
  content: CreatedContent;
  plan: StrategicPlan;
  confidence: number;
};

export type PersistEvaluationInput = {
  workspaceId: string;
  userId: string;
  contentId: string;
  quality: QualityScore;
  confidence: number;
};

export type PersistLlmJudgeEvaluationInput = {
  workspaceId: string;
  userId: string;
  contentId: string;
  evaluation: QualityEvaluationResult;
  confidence?: number;
  workflowRunId?: string;
};

export async function persistLlmJudgeEvaluationViaReconciler(input: PersistLlmJudgeEvaluationInput) {
  const { evaluation } = input;
  const dims = evaluation.dimensions;

  return secureSyncToSoR({
    table: SorTableNames.AI_CMO_EVALUATIONS,
    workspaceId: input.workspaceId,
    userId: input.userId,
    auditAction: 'ai_cmo.evaluation.llm_judge',
    auditMetadata: {
      contentId: input.contentId,
      overallScore: evaluation.overallScore,
      autoRejected: evaluation.autoRejected,
    },
    data: {
      workspace_id: input.workspaceId,
      content_id: input.contentId,
      evaluator_type: 'llm_as_judge',
      accuracy_score: dims.accuracy,
      localization_score: dims.localization,
      brand_alignment_score: dims.brandAlignment,
      hallucination_flag: evaluation.hallucinationFlag,
      overall_quality_score: evaluation.overallScore,
      uniqueness_score: dims.uniqueness,
      eeat_score: dims.eeat,
      engagement_score: dims.engagement,
      platform_compliance_score: dims.platformCompliance,
      auto_rejected: evaluation.autoRejected,
      rejection_reasons: evaluation.rejectionReasons,
      evaluator_model: evaluation.evaluatorModel,
      calibrated_confidence: input.confidence ?? null,
      evaluation_details: {
        dimensions: dims,
        safetyScore: dims.safety,
        revisionFeedback: evaluation.revisionFeedback,
        workflowRunId: input.workflowRunId,
      },
    },
  });
}

export async function persistEvaluationViaReconciler(input: PersistEvaluationInput) {
  return secureSyncToSoR({
    table: SorTableNames.AI_CMO_EVALUATIONS,
    workspaceId: input.workspaceId,
    userId: input.userId,
    auditAction: 'ai_cmo.evaluation.created',
    auditMetadata: { contentId: input.contentId, confidence: input.confidence },
    data: {
      workspace_id: input.workspaceId,
      content_id: input.contentId,
      evaluator_type: 'automated',
      overall_quality_score: input.quality.overallScore,
      engagement_score: input.quality.helpfulContentScore,
      brand_alignment_score: input.quality.eeatScore,
      uniqueness_score: input.quality.uniqueness,
      eeat_score: input.quality.eeatScore,
      calibrated_confidence: input.confidence,
      evaluator_model: 'content_quality_engine',
    },
  });
}

export async function updateCampaignConfidenceViaReconciler(input: {
  workspaceId: string;
  userId: string;
  campaignId: string;
  confidence: number;
}) {
  return securePatchSoR({
    table: SorTableNames.AI_CMO_CAMPAIGNS,
    id: input.campaignId,
    workspaceId: input.workspaceId,
    userId: input.userId,
    auditAction: 'ai_cmo.campaign.confidence_updated',
    auditMetadata: { confidence: input.confidence },
    patch: { calibrated_confidence: input.confidence },
  });
}

export async function createCampaignViaReconciler(input: CreateCampaignInput) {
  const objective =
    typeof input.objective === 'string' ? { summary: input.objective } : input.objective;

  return secureSyncToSoR({
    table: SorTableNames.AI_CMO_CAMPAIGNS,
    workspaceId: input.workspaceId,
    userId: input.userId,
    auditAction: 'ai_cmo.campaign.created',
    data: {
      workspace_id: input.workspaceId,
      name: input.name,
      brand_id: input.brandId ?? null,
      objective,
      status: 'planning',
    },
  });
}

export async function persistContentPieceViaReconciler(input: PersistContentPieceInput) {
  return secureSyncToSoR({
    table: SorTableNames.AI_CMO_CONTENT_PIECES,
    workspaceId: input.workspaceId,
    userId: input.userId,
    auditAction: 'ai_cmo.content_piece.created',
    auditMetadata: { campaignId: input.campaignId, confidence: input.confidence },
    data: {
      workspace_id: input.workspaceId,
      campaign_id: input.campaignId,
      locale: input.content.locale,
      content: {
        caption: input.content.caption,
        hashtags: input.content.hashtags,
        callToAction: input.content.callToAction,
        platforms: input.content.platforms,
        plan: {
          horizon: input.plan.horizon,
          keyMessages: input.plan.keyMessages,
          kpis: input.plan.kpis,
        },
        confidence: input.confidence,
        draftMetadata: input.content.draftMetadata,
      },
    },
  });
}

export type LinkCampaignPublishInput = LinkCampaignPostInput;

export type LinkCampaignPublishResult = LinkPostResult;

export async function linkCampaignToPublishPostViaReconciler(
  input: LinkCampaignPublishInput,
): Promise<LinkCampaignPublishResult> {
  return linkCampaignPostViaReconciler(input);
}

export const campaignServiceUtils = {
  createCampaignViaReconciler,
  persistContentPieceViaReconciler,
  persistEvaluationViaReconciler,
  persistLlmJudgeEvaluationViaReconciler,
  updateCampaignConfidenceViaReconciler,
  linkCampaignToPublishPostViaReconciler,
};
