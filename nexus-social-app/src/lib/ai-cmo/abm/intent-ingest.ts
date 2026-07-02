/**
 * ABM intent score ingestion — upserts by workspace + domain.
 */

import { verifyWorkspaceMembership } from '@/lib/oauth/auth-guard';
import { auditLog } from '@/lib/audit';
import { supabaseAdmin } from '@/lib/supabase/server';
import { scoreToBuyerStage } from '@/lib/ai-cmo/abm/accounts-query';

export type IntentIngestPayload = {
  domain: string;
  accountName?: string;
  industry?: string;
  topics?: string[];
  topic?: string;
  score: number;
  buyerStage?: 'awareness' | 'consideration' | 'decision';
  source?: string;
};

export type IntentIngestInput = {
  workspaceId: string;
  userId: string;
  payload: IntentIngestPayload;
};

export type IntentIngestResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export function currentMonthUtc(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function normalizeDomain(domain: string): string {
  return domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
}

function domainToAccountName(domain: string): string {
  const base = domain.replace(/^www\./, '').split('.')[0] ?? domain;
  return base.charAt(0).toUpperCase() + base.slice(1);
}

export async function ingestIntentScores(input: IntentIngestInput): Promise<IntentIngestResult> {
  const domain = normalizeDomain(input.payload.domain);
  if (!domain) return { ok: false, error: 'domain is required' };

  const intentScore = Math.round(input.payload.score);
  if (intentScore < 1 || intentScore > 100) return { ok: false, error: 'score must be 1–100' };

  try {
    await verifyWorkspaceMembership({ userId: input.userId, workspaceId: input.workspaceId });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'RLS check failed' };
  }

  const topics = input.payload.topics?.length
    ? input.payload.topics.map((t) => t.trim()).filter(Boolean)
    : [input.payload.topic?.trim() || 'general'];

  const buyerStage = input.payload.buyerStage ?? scoreToBuyerStage(intentScore);
  const accountName = input.payload.accountName?.trim() || domainToAccountName(domain);
  const industry = input.payload.industry?.trim() || 'General';

  const row = {
    workspace_id: input.workspaceId,
    account_name: accountName,
    domain,
    industry,
    intent_score: intentScore,
    buyer_stage: buyerStage,
    topics,
    last_updated: new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin
    .from('account_intent_scores')
    .upsert(row, { onConflict: 'workspace_id,domain' })
    .select('id')
    .single();

  if (error || !data?.id) {
    return { ok: false, error: error?.message ?? 'Upsert failed' };
  }

  await auditLog(input.workspaceId, input.userId, 'abm.intent.scored', {
    domain,
    intentScore,
    topics,
    buyerStage,
    recordId: data.id,
    source: input.payload.source ?? 'intent_provider',
  });

  return { ok: true, id: data.id as string };
}

export const intentIngestUtils = {
  ingestIntentScores,
  currentMonthUtc,
  normalizeDomain,
};
