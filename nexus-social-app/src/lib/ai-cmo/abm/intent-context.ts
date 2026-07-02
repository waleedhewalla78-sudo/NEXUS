/**
 * ABM context injection for Strategic Brain — reads account_intent_scores before LLM call.
 */

import { supabaseAdmin } from '@/lib/supabase/server';
import { buyerStageToFunnel, deriveFunnelStageFromScore } from '@/lib/ai-cmo/abm/accounts-query';

export type AbmIntentAccount = {
  accountName: string;
  domain: string;
  topics: string[];
  intentScore: number;
  buyerStage: string;
};

export type AbmIntentContext = {
  accounts: AbmIntentAccount[];
  topScore: number;
  funnelStage: 'BOFU' | 'MOFU' | 'TOFU';
  promptBlock: string;
};

/** @deprecated use buyerStageToFunnel or deriveFunnelStageFromScore */
export function deriveFunnelStage(topScore: number): AbmIntentContext['funnelStage'] {
  return deriveFunnelStageFromScore(topScore);
}

export function buildAbmPromptBlock(accounts: AbmIntentAccount[], funnelStage: AbmIntentContext['funnelStage']): string {
  if (accounts.length === 0) {
    return 'ABM CONTEXT: No high-intent accounts detected. Default to TOFU educational content.';
  }

  const lines = accounts.map((a) => {
    const topics = a.topics.length ? a.topics.join(', ') : 'general';
    return `- ${a.accountName} (${a.domain}) [${a.buyerStage}]: intent ${a.intentScore}/100 — topics: ${topics}`;
  });

  const stageDirective =
    funnelStage === 'BOFU'
      ? 'Generate bottom-of-funnel direct content (demos, ROI, case studies). Prefer formal Arabic (MSA) when locale is Arabic.'
      : funnelStage === 'MOFU'
        ? 'Generate consideration-stage content (comparisons, webinars, proof points).'
        : 'Generate top-of-funnel educational thought leadership.';

  return `ABM CONTEXT (account intent scores):\n${lines.join('\n')}\nFUNNEL STAGE: ${funnelStage}. ${stageDirective}`;
}

export async function fetchAbmIntentContext(workspaceId: string, limit = 5): Promise<AbmIntentContext> {
  const { data, error } = await supabaseAdmin
    .from('account_intent_scores')
    .select('account_name, domain, topics, intent_score, buyer_stage')
    .eq('workspace_id', workspaceId)
    .order('intent_score', { ascending: false })
    .limit(limit);

  if (error || !data?.length) {
    return {
      accounts: [],
      topScore: 0,
      funnelStage: 'TOFU',
      promptBlock: buildAbmPromptBlock([], 'TOFU'),
    };
  }

  const accounts: AbmIntentAccount[] = data.map((row) => ({
    accountName: String(row.account_name),
    domain: String(row.domain),
    topics: Array.isArray(row.topics) ? row.topics.map(String) : [],
    intentScore: Number(row.intent_score),
    buyerStage: String(row.buyer_stage),
  }));

  const topScore = accounts[0]?.intentScore ?? 0;
  const funnelStage =
    accounts[0]?.buyerStage != null
      ? buyerStageToFunnel(String(accounts[0].buyerStage))
      : deriveFunnelStageFromScore(topScore);

  return {
    accounts,
    topScore,
    funnelStage,
    promptBlock: buildAbmPromptBlock(accounts, funnelStage),
  };
}

export const abmIntentContextUtils = {
  fetchAbmIntentContext,
  deriveFunnelStage,
  buildAbmPromptBlock,
};
