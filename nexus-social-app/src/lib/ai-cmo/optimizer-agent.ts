/**
 * Backward-compatible barrel — canonical Optimizer in agents/optimizer-agent.ts
 */

export {
  OptimizerAgent,
  optimizerAgent,
  analyzeCampaignOutcome,
  optimizerAgentUtils,
} from '@/lib/ai-cmo/agents/optimizer-agent';

export type {
  OptimizerOutput,
  OptimizerRunInput,
  OptimizerLearning,
  OptimizerResult,
  ProposedLearning,
  StrategyDelta,
  VarianceAnalysis,
} from '@/lib/ai-cmo/agents/types/optimizer';

import { SorTableNames } from '@/lib/ai-cmo/types/reconciler';
import { secureSyncToSoR } from '@/lib/ai-cmo/utils/secure-reconciler-writer';
import type { ProposedLearning } from '@/lib/ai-cmo/agents/types/optimizer';

/** Reconciler write path — separate from OptimizerAgent.run (L7 boundary). */
export async function persistOptimizerLearnings(input: {
  workspaceId: string;
  userId: string;
  learnings: ProposedLearning[];
}) {
  const results = [];

  for (const learning of input.learnings) {
    const result = await secureSyncToSoR({
      table: SorTableNames.AI_CMO_LEARNINGS,
      workspaceId: input.workspaceId,
      userId: input.userId,
      auditAction: 'ai_cmo.learning.created',
      auditMetadata: { source: 'optimizer_agent' },
      data: {
        workspace_id: input.workspaceId,
        learning_type: learning.learningType,
        context: learning.context,
        action: learning.action,
        outcome: learning.outcome,
        roi_impact: learning.roiImpact,
        confidence: learning.confidence,
      },
    });
    results.push(result);
  }

  return results;
}

export const persistOptimizerLearningsUtils = {
  persistOptimizerLearnings,
};
