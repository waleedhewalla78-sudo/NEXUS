/**

 * Feature 004 Phase 3/4 — Agent cost tracking + observability middleware.

 * Calculates cost BEFORE reconciler write to ai_cmo_cost_ledger.

 */



import {

  estimateTokenCost,

  estimateTokensFromText,

  recordAgentCost,

} from '@/lib/ai-cmo/finops/cost-ledger';

import { assertBudgetAvailable } from '@/lib/finops/budget-guard';

import { traceAgentCall } from '@/lib/observability/trace-wrapper';

import type { AgentCostMetadata, AgentExecutionResult } from '@/lib/finops/types';



export type WithAgentCostTrackingInput<T> = {

  workspaceId: string;

  userId: string;

  agentName: string;

  campaignId?: string | null;

  modelUsed?: string;

  estimatedCostUsd?: number;

  traceId?: string;

  fn: () => Promise<AgentExecutionResult<T>>;

};



export async function withAgentCostTracking<T>(input: WithAgentCostTrackingInput<T>): Promise<T> {

  await assertBudgetAvailable(input.workspaceId, input.estimatedCostUsd ?? 0.01);



  const traced = await traceAgentCall({

    agentName: input.agentName,

    workspaceId: input.workspaceId,

    userId: input.userId,

    traceId: input.traceId,

    sessionId: input.campaignId ?? undefined,

    model: input.modelUsed,

    fn: async () => input.fn(),

  });



  const execution = traced.result;

  const usageText = execution.usageText ?? '';

  const tokenCount =

    execution.tokenCount ??

    traced.tokenUsage ??

    (usageText ? estimateTokensFromText(usageText) : 0);

  const modelUsed = execution.modelUsed ?? input.modelUsed ?? 'openrouter/default';

  const amountUsd = estimateTokenCost(tokenCount, modelUsed);



  const metadata: AgentCostMetadata = {

    workspaceId: input.workspaceId,

    userId: input.userId,

    agentName: input.agentName,

    campaignId: input.campaignId,

    tokenCount,

    modelUsed,

    amountUsd,

  };



  await recordAgentCost({

    workspaceId: metadata.workspaceId,

    userId: metadata.userId,

    agentName: metadata.agentName,

    campaignId: metadata.campaignId,

    tokenCount: metadata.tokenCount,

    modelUsed: metadata.modelUsed,

    amountUsd: metadata.amountUsd,

    metadata: {

      middleware: 'withAgentCostTracking',

      traceId: traced.traceId,

      latencyMs: traced.latencyMs,

    },

  });



  return execution.result;

}



export const costMiddlewareUtils = {

  withAgentCostTracking,

};


