/**
 * FinOps runtime — records agent token/API costs via reconciler (Phase D).
 */

import { SorTableNames } from '@/lib/ai-cmo/types/reconciler';
import { secureSyncToSoR } from '@/lib/ai-cmo/utils/secure-reconciler-writer';

const DEFAULT_COST_PER_1K_TOKENS_USD = 0.002;

export type RecordAgentCostInput = {
  workspaceId: string;
  userId: string;
  agentName: string;
  campaignId?: string | null;
  tokenCount?: number | null;
  modelUsed?: string | null;
  amountUsd?: number | null;
  metadata?: Record<string, unknown>;
};

export function estimateTokenCost(tokenCount: number, modelUsed?: string | null): number {
  const rate =
    modelUsed?.includes('gpt-4') && !modelUsed.includes('mini')
      ? 0.01
      : DEFAULT_COST_PER_1K_TOKENS_USD;
  return Number(((tokenCount / 1000) * rate).toFixed(6));
}

export function estimateTokensFromText(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

export async function recordAgentCost(input: RecordAgentCostInput) {
  const tokenCount = input.tokenCount ?? 0;
  const amountUsd =
    input.amountUsd ?? (tokenCount > 0 ? estimateTokenCost(tokenCount, input.modelUsed) : 0);

  if (amountUsd <= 0 && tokenCount <= 0) {
    return { ok: true as const, skipped: true };
  }

  return secureSyncToSoR({
    table: SorTableNames.AI_CMO_COST_LEDGER,
    workspaceId: input.workspaceId,
    userId: input.userId,
    auditAction: 'ai_cmo.cost.recorded',
    auditMetadata: { agentName: input.agentName, tokenCount },
    data: {
      workspace_id: input.workspaceId,
      campaign_id: input.campaignId ?? null,
      agent_name: input.agentName,
      cost_category: 'tokens',
      amount_usd: amountUsd,
      token_count: tokenCount > 0 ? tokenCount : null,
      model_used: input.modelUsed ?? null,
      metadata: input.metadata ?? {},
    },
  });
}

export const costLedgerUtils = {
  recordAgentCost,
  estimateTokenCost,
  estimateTokensFromText,
};
