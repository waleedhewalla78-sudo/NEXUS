/**
 * Wires Sprint 13 agents into the campaign workflow stub (no Inngest).
 * Phase 3: structured policy engine, FinOps middleware, governance approval queue.
 * Phase 4: LLM-as-Judge quality evaluator, revision loop, evaluation persistence.
 */

import { planCampaignStrategy } from '@/lib/ai-cmo/strategic-brain';
import { generateCampaignContent, reviseCampaignContent } from '@/lib/ai-cmo/creator-agent';
import {
  createCampaignViaReconciler,
  persistContentPieceViaReconciler,
  persistLlmJudgeEvaluationViaReconciler,
  updateCampaignConfidenceViaReconciler,
} from '@/lib/ai-cmo/campaign-service';
import { linkCampaignPostViaReconciler } from '@/lib/ai-cmo/services/campaign-post-linker';
import { withAiCmoSpan } from '@/lib/telemetry/ai-cmo-tracer';
import { memoryRepository } from '@/lib/ai-cmo/memory/memory-repository';
import { assertBudgetAvailable } from '@/lib/finops/budget-guard';
import { withAgentCostTracking } from '@/lib/finops/cost-middleware';
import {
  complianceAgent,
  resolveComplianceDataRegion,
} from '@/lib/ai-cmo/agents/compliance-agent';
import type { ComplianceDataRegion } from '@/lib/ai-cmo/agents/types/business';
import {
  contentPieceFromPlanAndContent,
  policyEngineV2,
} from '@/lib/governance/policy-engine-v2';
import { approvalService } from '@/lib/governance/approval-service';
import { riskTierToApprovalSeverity } from '@/lib/governance/types/approval';
import type { PolicyResult, RiskTier } from '@/lib/governance/types/policy';
import { ContentQualityEngine } from '@/lib/quality/content-quality-engine';
import { qualityEvaluator } from '@/lib/ai-cmo/quality/quality-evaluator';
import { checkContentUniqueness } from '@/lib/ai-cmo/quality/uniqueness-guard';
import type { QualityEvaluationResult } from '@/lib/ai-cmo/quality/types';
import {
  computeCalibratedConfidence,
  confidenceBand,
} from '@/lib/evaluation/calibrated-confidence';
import { renderExplainability } from '@/lib/explainability/renderer';
import type { CampaignWorkflowDeps } from '@/lib/orchestration/workflows/campaign-workflow';
import type { CreatedContent } from '@/lib/ai-cmo/creator-agent';
import type { StrategicPlan } from '@/lib/ai-cmo/strategic-brain';

export type BuildCampaignWorkflowDepsInput = {
  workspaceId: string;
  userId: string;
  brandName?: string;
  locale?: string;
  industry?: string;
  brandVoice?: { tone?: string; values?: string[]; guidelines?: string };
  workspaceDifyApiKey?: string | null;
  brandId?: string | null;
  campaignId?: string;
  workflowRunId?: string;
  targetAccountId?: string | null;
  dataRegion?: ComplianceDataRegion;
  /** When true, post link is deferred to Inngest link-post step (Phase 1). */
  skipPostLink?: boolean;
  onApprovalRequired?: (content: Record<string, unknown>, reason: string) => Promise<void>;
};

export type BuiltCampaignWorkflowDeps = {
  deps: CampaignWorkflowDeps;
  getIds: () => { campaignId?: string; contentId?: string; postId?: string };
};

type GenerateWrapper = {
  content: CreatedContent;
  plan: StrategicPlan;
  quality: ReturnType<ContentQualityEngine['evaluate']>;
  confidence: number;
  qualityEvaluation?: QualityEvaluationResult;
  rejectReasons?: string[];
};

const UAT_DEMO_WORKSPACE_ID = '11111111-1111-1111-1111-111111111111';

function isUatFastWorkflow(workspaceId: string): boolean {
  return (
    process.env.NODE_ENV !== 'production' &&
    process.env.UAT_FAST_WORKFLOW !== 'false' &&
    workspaceId === (process.env.UAT_DEMO_WORKSPACE_ID ?? UAT_DEMO_WORKSPACE_ID)
  );
}

function buildUatFastPlan(objective: string): StrategicPlan {
  return {
    objective,
    audience: 'Enterprise marketing operators',
    horizon: 'operational',
    channels: ['linkedin'],
    keyMessages: [objective],
    contentThemes: ['uat-verification'],
    kpis: ['engagement_rate'],
    rawSummary: objective.slice(0, 120),
  };
}

function buildUatFastContent(objective: string, contentLocale: string): CreatedContent {
  const token = objective.match(/uat-[a-f0-9-]+/i)?.[0] ?? `uat-${Date.now()}`;
  return {
    caption: `UAT live verification (${token}): practical B2B insight with grounded claims and a clear next step.`,
    hashtags: ['#NexusSocial', '#UAT'],
    callToAction: 'Register for the briefing',
    platforms: ['linkedin'],
    locale: contentLocale,
    draftMetadata: { source: 'uat_fast_workflow', uat_token: token },
  };
}

function extractPlanFromWrapper(planWrapper: unknown, fallbackObjective: string): StrategicPlan {
  const w = planWrapper as {
    plan?: StrategicPlan;
    objective?: string;
    result?: { plan?: StrategicPlan; objective?: string };
  };
  if (w.plan) return w.plan;
  if (w.result?.plan) return w.result.plan;
  return buildUatFastPlan(w.objective ?? w.result?.objective ?? fallbackObjective);
}

export function buildCampaignWorkflowDeps(input: BuildCampaignWorkflowDepsInput): BuiltCampaignWorkflowDeps {
  const qualityEngine = new ContentQualityEngine();
  let resolvedCampaignId = input.campaignId;
  let resolvedContentId: string | undefined;
  let resolvedPostId: string | undefined;
  const locale = input.locale ?? 'en-US';

  async function ensureDraftContent(wrapper: GenerateWrapper): Promise<string> {
    if (resolvedContentId) return resolvedContentId;

    if (!resolvedCampaignId) {
      const created = await createCampaignViaReconciler({
        workspaceId: input.workspaceId,
        userId: input.userId,
        name: wrapper.plan.objective.slice(0, 80) || 'AI CMO Campaign',
        brandId: input.brandId,
        objective: wrapper.plan.objective,
      });
      if (!created.ok) throw new Error(created.error);
      resolvedCampaignId = created.id;
    }

    const persisted = await persistContentPieceViaReconciler({
      workspaceId: input.workspaceId,
      userId: input.userId,
      campaignId: resolvedCampaignId,
      content: wrapper.content,
      plan: wrapper.plan,
      confidence: wrapper.confidence,
    });

    if (!persisted.ok) throw new Error(persisted.error);
    resolvedContentId = persisted.id;
    return persisted.id;
  }

  return {
    deps: {
      finopsPreflight: async () => assertBudgetAvailable(input.workspaceId),

      planCampaign: async (objective) => {
        if (isUatFastWorkflow(input.workspaceId)) {
          const plan = buildUatFastPlan(objective);
          return { plan, objective };
        }
        return withAiCmoSpan({
          name: 'ai_cmo.plan_campaign',
          attributes: { workspace_id: input.workspaceId, agent: 'strategic_brain' },
          fn: async () =>
            withAgentCostTracking({
              workspaceId: input.workspaceId,
              userId: input.userId,
              agentName: 'strategic_brain',
              campaignId: resolvedCampaignId,
              traceId: input.workflowRunId,
              fn: async () => {
                const plan = await planCampaignStrategy({
                  objective,
                  brandName: input.brandName,
                  locale,
                  userId: input.userId,
                  workspaceId: input.workspaceId,
                  campaignId: resolvedCampaignId,
                  workspaceDifyApiKey: input.workspaceDifyApiKey,
                  targetAccountId: input.targetAccountId,
                });
                return {
                  result: { plan, objective },
                  usageText: `${objective} ${plan.rawSummary}`,
                  modelUsed: 'dify/strategic_brain',
                };
              },
            }),
        });
      },

      retrieveMemory: async (objective) =>
        memoryRepository.retrieve({
          workspaceId: input.workspaceId,
          objective,
          k: 5,
        }),

      generateContent: async (planWrapper, memoryItems) => {
        if (isUatFastWorkflow(input.workspaceId)) {
          const objective =
            (planWrapper as { objective?: string }).objective ??
            extractPlanFromWrapper(planWrapper, 'uat').objective;
          const plan = extractPlanFromWrapper(planWrapper, objective);
          const content = buildUatFastContent(plan.objective, locale);
          const corpus = extractCorpusFromMemory(memoryItems);
          const quality = qualityEngine.evaluate({
            text: content.caption,
            existingCorpus: corpus,
            keyword: plan.objective.split(/\s+/)[0],
          });
          const confidence = computeCalibratedConfidence({
            dataQuality: quality.overallScore,
            historicalPerformance: 0.7,
            policyCompliance: 1,
            marketVolatility: 0.75,
          });
          return {
            content,
            plan,
            quality,
            confidence,
          };
        }
        return withAiCmoSpan({
          name: 'ai_cmo.generate_content',
          attributes: { workspace_id: input.workspaceId, agent: 'creator' },
          fn: async () => {
            const plan = extractPlanFromWrapper(planWrapper, 'campaign');
            const content = await withAgentCostTracking({
              workspaceId: input.workspaceId,
              userId: input.userId,
              agentName: 'creator',
              campaignId: resolvedCampaignId,
              traceId: input.workflowRunId,
              fn: async () => {
                const created = await generateCampaignContent({
                  plan,
                  locale,
                  userId: input.userId,
                  workspaceId: input.workspaceId,
                  campaignId: resolvedCampaignId,
                  workspaceDifyApiKey: input.workspaceDifyApiKey,
                });
                return {
                  result: created,
                  usageText: `${created.caption} ${created.callToAction}`,
                  modelUsed: 'dify/creator',
                };
              },
            });

            const corpus = extractCorpusFromMemory(memoryItems);
            const quality = qualityEngine.evaluate({
              text: content.caption,
              existingCorpus: corpus,
              keyword: plan.objective.split(/\s+/)[0],
            });

            const confidence = computeCalibratedConfidence({
              dataQuality: quality.overallScore,
              historicalPerformance: 0.7,
              policyCompliance: 1,
              marketVolatility: 0.75,
            });

            return {
              content,
              plan,
              quality,
              confidence,
              explainability: renderExplainability({
                persona: 'operator',
                decision: 'Campaign content generated',
                confidence,
                confidenceBand: confidenceBand(confidence),
                policySummary: 'Pending structured policy review',
                qualitySummary: `Heuristic score ${Math.round(quality.overallScore * 100)}%`,
                rationaleBullets: plan.keyMessages,
                recommendedAction: 'Pending LLM-as-Judge evaluation',
              }),
              rejectReasons: qualityEngine.getRejectReasons(quality),
            };
          },
        });
      },

      checkContentUniqueness: async (contentWrapper) => {
        const wrapper = contentWrapper as GenerateWrapper;
        const caption = wrapper.content.caption;
        return checkContentUniqueness(caption, input.workspaceId);
      },

      reviseContent: async (contentWrapper, revisionFeedback) =>
        withAiCmoSpan({
          name: 'ai_cmo.revise_content',
          attributes: { workspace_id: input.workspaceId, agent: 'creator' },
          fn: async () => {
            const wrapper = contentWrapper as GenerateWrapper;
            const revised = await withAgentCostTracking({
              workspaceId: input.workspaceId,
              userId: input.userId,
              agentName: 'creator',
              campaignId: resolvedCampaignId,
              traceId: input.workflowRunId,
              fn: async () => {
                const created = await reviseCampaignContent({
                  plan: wrapper.plan,
                  locale,
                  userId: input.userId,
                  workspaceId: input.workspaceId,
                  campaignId: resolvedCampaignId,
                  workspaceDifyApiKey: input.workspaceDifyApiKey,
                  revisionFeedback,
                });
                return {
                  result: created,
                  usageText: `${created.caption} ${created.callToAction}`,
                  modelUsed: 'dify/creator',
                };
              },
            });

            const quality = qualityEngine.evaluate({
              text: revised.caption,
              keyword: wrapper.plan.objective.split(/\s+/)[0],
            });

            const confidence = computeCalibratedConfidence({
              dataQuality: quality.overallScore,
              historicalPerformance: 0.7,
              policyCompliance: 1,
              marketVolatility: 0.75,
            });

            return {
              ...wrapper,
              content: revised,
              quality,
              confidence,
              qualityEvaluation: undefined,
            };
          },
        }),

      structuredPolicyReview: async (contentWrapper) => {
        const wrapper = contentWrapper as GenerateWrapper;

        const piece = contentPieceFromPlanAndContent({
          plan: wrapper.plan,
          content: wrapper.content,
          locale,
          industry: input.industry,
          qualityScore: wrapper.qualityEvaluation?.overallScore ?? wrapper.quality.overallScore,
        });

        const dataRegion =
          input.dataRegion ?? resolveComplianceDataRegion(locale) ?? undefined;

        await complianceAgent.run({
          workspaceId: input.workspaceId,
          userId: input.userId,
          content: {
            caption: wrapper.content.caption,
            locale: wrapper.content.locale,
            callToAction: wrapper.content.callToAction,
          },
          jurisdictions: dataRegion === 'mena' ? ['uae_pdpl'] : dataRegion === 'eu' ? ['eu_gdpr'] : ['generic'],
          dataRegion,
        });

        return policyEngineV2.evaluate(piece, { dataRegion });
      },

      runQualityEvaluation: async (contentWrapper, memoryItems) => {
        const wrapper = contentWrapper as GenerateWrapper;
        const corpus = extractCorpusFromMemory(memoryItems ?? []);

        const evaluation = await qualityEvaluator.evaluate({
          content: {
            caption: wrapper.content.caption,
            hashtags: wrapper.content.hashtags,
            callToAction: wrapper.content.callToAction,
            platforms: wrapper.content.platforms,
            locale: wrapper.content.locale,
          },
          brandVoice: input.brandVoice,
          planObjective: wrapper.plan.objective,
          existingCorpus: corpus,
          workspaceId: input.workspaceId,
        });

        return evaluation;
      },

      persistQualityEvaluation: async (contentWrapper, evaluation) => {
        const wrapper = contentWrapper as GenerateWrapper;
        const contentId = await ensureDraftContent(wrapper);

        const result = await persistLlmJudgeEvaluationViaReconciler({
          workspaceId: input.workspaceId,
          userId: input.userId,
          contentId,
          evaluation,
          confidence: wrapper.confidence,
          workflowRunId: input.workflowRunId,
        });

        if (!result.ok) {
          throw new Error(result.error);
        }

        return { evaluationId: result.id, contentId };
      },

      syncToSoR: async (contentWrapper) =>
        withAiCmoSpan({
          name: 'ai_cmo.sync_to_sor',
          attributes: { workspace_id: input.workspaceId },
          fn: async () => {
            const wrapper = contentWrapper as GenerateWrapper;

            await ensureDraftContent(wrapper);

            await updateCampaignConfidenceViaReconciler({
              workspaceId: input.workspaceId,
              userId: input.userId,
              campaignId: resolvedCampaignId!,
              confidence: wrapper.confidence,
            });

            if (!input.skipPostLink) {
              const postLink = await linkCampaignPostViaReconciler({
                workspaceId: input.workspaceId,
                userId: input.userId,
                campaignId: resolvedCampaignId!,
                contentId: resolvedContentId!,
                content: wrapper.content,
                brandId: input.brandId,
              });

              if (!postLink.ok) {
                throw new Error(postLink.error);
              }

              resolvedPostId = postLink.postId;
            }
          },
        }),

      routeToApproval: async (contentWrapper, reason, riskTier) => {
        const severity = riskTier
          ? riskTierToApprovalSeverity(riskTier)
          : inferApprovalSeverityFromReason(reason);

        if (resolvedCampaignId) {
          await approvalService
            .createApprovalRequest({
              workspaceId: input.workspaceId,
              userId: input.userId,
              campaignId: resolvedCampaignId,
              contentId: resolvedContentId ?? null,
              severity,
              reason,
              riskTier,
              payload: contentWrapper as Record<string, unknown>,
            })
            .catch((err) => {
              const message = err instanceof Error ? err.message : String(err);
              if (!message.includes('does not exist') && !message.includes('Unsupported SoR table')) {
                console.warn('[campaign-workflow] approval queue write failed:', message);
              }
            });
        }

        if (input.onApprovalRequired) {
          await input.onApprovalRequired(contentWrapper as Record<string, unknown>, reason);
        }
      },
    },
    getIds: () => ({
      campaignId: resolvedCampaignId,
      contentId: resolvedContentId,
      postId: resolvedPostId,
    }),
  };
}

function extractCorpusFromMemory(memoryItems: unknown[]): string[] {
  return memoryItems
    .map((item) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object') {
        const record = item as Record<string, unknown>;
        const action = record.action;
        const outcome = record.outcome;
        return JSON.stringify({ action, outcome });
      }
      return '';
    })
    .filter((text) => text.length > 0);
}

function inferApprovalSeverityFromReason(reason: string): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' {
  if (/CRITICAL|block|religious|political|HALLUCINATION/i.test(reason)) return 'CRITICAL';
  if (/HIGH|policy|compliance|pdpl|legal/i.test(reason)) return 'HIGH';
  if (/auto-reject|quality gate/i.test(reason)) return 'HIGH';
  if (/threshold|approval/i.test(reason)) return 'MEDIUM';
  return 'LOW';
}

export const campaignWorkflowDepsUtils = {
  buildCampaignWorkflowDeps,
};

export type { PolicyResult, RiskTier };
