/**
 * Feature 004 Phase 2/6 — Optimizer agent (L9 learning loop proposals).
 *
 * [SPEC]
 * 1. Fetch campaign outcomes (MemoryRepository)
 * 2. Fetch prior learnings (MemoryRepository)
 * 3. LLM variance analysis via ProviderRouter + traceAgentCall (INT-02)
 * 4. Fail-safe to rule-based proposals if LLM parse fails
 * 5. Does NOT write to SoR — reconciler applies proposals separately
 *
 * Constitution: Optimizer (L6) proposes; Reconciler (L7) persists.
 */

import { z } from 'zod';
import { memoryRepository } from '@/lib/ai-cmo/memory/memory-repository';
import type { OutcomeRecord } from '@/lib/ai-cmo/memory/types';
import { providerRouter } from '@/lib/ai-cmo/providers/provider-router';
import { traceAgentCall } from '@/lib/observability/trace-wrapper';
import type {
  OptimizerOutput,
  OptimizerRunInput,
  ProposedLearning,
  StrategyDelta,
  VarianceAnalysis,
} from '@/lib/ai-cmo/agents/types/optimizer';
import {
  proposedLearningSchema,
  strategyDeltaSchema,
} from '@/lib/ai-cmo/agents/types/optimizer';

const DEFAULT_KPIS: Record<string, number> = {
  impressions: 1000,
  clicks: 50,
  conversions: 10,
  leads_generated: 5,
};

const OPTIMIZER_SYSTEM = `You are the Optimizer agent for an enterprise AI CMO platform.
Analyze campaign outcome variance vs expected KPIs and prior learnings.
Return JSON only (no markdown):
{
  "diagnosis": "string",
  "replanRecommended": boolean,
  "learnings": [
    {
      "learningType": "content_pattern|timing|audience|channel|tone",
      "context": {},
      "action": {},
      "outcome": {},
      "roiImpact": number,
      "confidence": 0.0-1.0
    }
  ],
  "strategyDelta": {
    "channels": ["string"],
    "keyMessages": ["string"],
    "budgetShiftPct": number,
    "rationale": "string"
  }
}`;

const optimizerLlmResponseSchema = z.object({
  diagnosis: z.string().optional(),
  replanRecommended: z.boolean().optional(),
  learnings: z.array(proposedLearningSchema).optional(),
  strategyDelta: strategyDeltaSchema.optional(),
});

export type OptimizerLlmVarianceInput = {
  workspaceId: string;
  campaignId: string;
  variance: VarianceAnalysis;
  priorLearnings: unknown[];
  outcome: OutcomeRecord;
  baselineDiagnosis: string;
};

export type OptimizerLlmVarianceResult = {
  diagnosis: string;
  learnings: ProposedLearning[];
  strategyDelta?: StrategyDelta;
  replanRecommended: boolean;
  llmUsed: boolean;
  modelUsed?: string;
};

function computeVariance(
  expected: Record<string, number> | undefined,
  outcome: OutcomeRecord,
): VarianceAnalysis {
  const exp = { ...DEFAULT_KPIS, ...expected };

  const entries: VarianceAnalysis = {};
  const pairs: Array<[string, number]> = [
    ['impressions', outcome.impressions],
    ['clicks', outcome.clicks],
    ['conversions', outcome.conversions],
    ['leads_generated', outcome.leadsGenerated],
  ];

  for (const [key, actual] of pairs) {
    const expectedValue = exp[key] ?? 0;
    const deltaPct =
      expectedValue > 0 ? Number((((actual - expectedValue) / expectedValue) * 100).toFixed(2)) : 0;
    entries[key] = { expected: expectedValue, actual, deltaPct };
  }

  return entries;
}

function buildFallbackLearnings(
  variance: VarianceAnalysis,
  outcome: OutcomeRecord,
  priorLearningCount: number,
): ProposedLearning[] {
  const learnings: ProposedLearning[] = [];
  const ctr = outcome.impressions > 0 ? outcome.clicks / outcome.impressions : 0;
  const convRate = outcome.clicks > 0 ? outcome.conversions / outcome.clicks : 0;

  if ((variance.clicks?.actual ?? 0) < (variance.clicks?.expected ?? 0) * 0.7) {
    learnings.push({
      learningType: 'channel',
      context: { metric: 'ctr', ctr, campaignId: outcome.campaignId, priorCount: priorLearningCount },
      action: { recommendation: 'Test alternate channels or refresh creative hooks' },
      outcome: { clicks: outcome.clicks, expected: variance.clicks?.expected ?? 0 },
      roiImpact: outcome.roiRatio ?? -0.1,
      confidence: 0.75,
    });
  }

  if ((variance.conversions?.actual ?? 0) < (variance.conversions?.expected ?? 0) * 0.7) {
    learnings.push({
      learningType: 'content_pattern',
      context: { metric: 'conversion_rate', convRate },
      action: { recommendation: 'Strengthen CTA and landing alignment' },
      outcome: { conversions: outcome.conversions },
      roiImpact: outcome.roiRatio ?? -0.15,
      confidence: 0.8,
    });
  }

  if (outcome.roiRatio != null && outcome.roiRatio > 1.5) {
    learnings.push({
      learningType: 'audience',
      context: { roiRatio: outcome.roiRatio },
      action: { recommendation: 'Scale winning audience segment' },
      outcome: { revenue: outcome.revenueAttributed, cost: outcome.cost },
      roiImpact: outcome.roiRatio,
      confidence: 0.85,
    });
  }

  return learnings;
}

function parseOptimizerLlmResponse(
  text: string,
  fallback: OptimizerLlmVarianceResult,
): OptimizerLlmVarianceResult {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      return fallback;
    }
    const parsed = optimizerLlmResponseSchema.parse(JSON.parse(match[0]));

    return {
      diagnosis: parsed.diagnosis ?? fallback.diagnosis,
      learnings: parsed.learnings?.length ? parsed.learnings : fallback.learnings,
      strategyDelta: parsed.strategyDelta ?? fallback.strategyDelta,
      replanRecommended: parsed.replanRecommended ?? fallback.replanRecommended,
      llmUsed: true,
      modelUsed: fallback.modelUsed,
    };
  } catch {
    return fallback;
  }
}

function isUnderperforming(
  outcome: OutcomeRecord,
  expectedKpis?: Record<string, number>,
): boolean {
  return (
    outcome.impressions > 0 &&
    outcome.clicks / outcome.impressions < 0.01 &&
    outcome.conversions < (expectedKpis?.conversions ?? DEFAULT_KPIS.conversions) * 0.5
  );
}

export async function runOptimizerLlmVarianceAnalysis(
  input: OptimizerLlmVarianceInput,
): Promise<OptimizerLlmVarianceResult> {
  const fallbackLearnings = buildFallbackLearnings(
    input.variance,
    input.outcome,
    input.priorLearnings.length,
  );

  const fallback: OptimizerLlmVarianceResult = {
    diagnosis: input.baselineDiagnosis,
    learnings: fallbackLearnings,
    replanRecommended: isUnderperforming(input.outcome),
    llmUsed: false,
  };

  const userPrompt = JSON.stringify({
    campaignId: input.campaignId,
    workspaceId: input.workspaceId,
    variance: input.variance,
    outcome: {
      impressions: input.outcome.impressions,
      clicks: input.outcome.clicks,
      conversions: input.outcome.conversions,
      roiRatio: input.outcome.roiRatio,
      cost: input.outcome.cost,
      revenue: input.outcome.revenueAttributed,
    },
    priorLearnings: input.priorLearnings.slice(0, 5),
    baselineDiagnosis: input.baselineDiagnosis,
  });

  try {
    const traced = await traceAgentCall({
      agentName: 'optimizer',
      workspaceId: input.workspaceId,
      userId: `optimizer-${input.workspaceId}`,
      sessionId: input.campaignId,
      input: { variance: input.variance, priorCount: input.priorLearnings.length },
      fn: async () => {
        const routerResult = await providerRouter.generate({
          systemPrompt: OPTIMIZER_SYSTEM,
          userPrompt,
          userId: `optimizer-${input.workspaceId}`,
          agentRole: 'optimizer',
        });
        return {
          result: routerResult.text,
          usageText: routerResult.text ?? userPrompt,
          modelUsed: routerResult.modelUsed,
        };
      },
    });

    const execution = traced.result;
    const text = execution.result;
    if (!text) {
      return fallback;
    }

    return parseOptimizerLlmResponse(text, {
      ...fallback,
      modelUsed: execution.modelUsed ?? 'provider-router/optimizer',
    });
  } catch (err) {
    console.warn('[optimizer-agent] LLM variance analysis failed — using fallback proposals:', err);
    return fallback;
  }
}

export class OptimizerAgent {
  async run(input: OptimizerRunInput): Promise<OptimizerOutput> {
    const [outcomes, priorLearnings] = await Promise.all([
      memoryRepository.getOutcomes({
        workspaceId: input.workspaceId,
        campaignId: input.campaignId,
        limit: 1,
      }),
      memoryRepository.retrieve({
        workspaceId: input.workspaceId,
        k: 5,
      }),
    ]);

    if (!outcomes.length) {
      return {
        campaignId: input.campaignId,
        workspaceId: input.workspaceId,
        diagnosis: 'No measured outcomes yet — run outcome ingestion after publish analytics sync',
        variance: {},
        learnings: [],
        replanRecommended: false,
        llmStubbed: true,
      };
    }

    const latest = outcomes[0];
    const variance = computeVariance(input.expectedKpis, latest);
    const underperforming = isUnderperforming(latest, input.expectedKpis);

    const baselineDiagnosis = underperforming
      ? 'Campaign underperforming vs expected KPIs — review channel mix and creative'
      : 'Performance variance analyzed against expected KPI band';

    const llm = await runOptimizerLlmVarianceAnalysis({
      workspaceId: input.workspaceId,
      campaignId: input.campaignId,
      variance,
      priorLearnings,
      outcome: latest,
      baselineDiagnosis,
    });

    return {
      campaignId: input.campaignId,
      workspaceId: input.workspaceId,
      diagnosis: llm.diagnosis,
      variance,
      learnings: llm.learnings,
      strategyDelta: llm.strategyDelta,
      replanRecommended: llm.replanRecommended ?? underperforming,
      llmStubbed: !llm.llmUsed,
    };
  }
}

export const optimizerAgent = new OptimizerAgent();

export async function analyzeCampaignOutcome(input: OptimizerRunInput & { userId: string }) {
  return optimizerAgent.run(input);
}

export const optimizerAgentUtils = {
  OptimizerAgent,
  optimizerAgent,
  analyzeCampaignOutcome,
  runOptimizerLlmVarianceAnalysis,
};
