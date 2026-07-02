/**
 * Build ABM-enriched campaign objective and enqueue existing workflow.
 */

import { randomUUID } from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabase/server';
import { createProcessingCampaignJob } from '@/lib/ai-cmo/campaign-job-store';
import { sendAiCmoInngestEvent } from '@/lib/orchestration/inngest-client';
import { AI_CMO_INNGEST_EVENT_NAMES } from '@/lib/orchestration/types/events';
import { getRedisClient } from '@/lib/redis-client';
import { secureSyncToSoR } from '@/lib/ai-cmo/utils/secure-reconciler-writer';
import { SorTableNames } from '@/lib/ai-cmo/types/reconciler';
import type { AbmAccountRow } from '@/lib/ai-cmo/abm/accounts-query';

export type ActivatePlaybookInput = {
  workspaceId: string;
  userId: string;
  accountId: string;
  locale?: string;
};

export type ActivatePlaybookResult =
  | {
      ok: true;
      jobId: string;
      pollUrl: string;
      objectivePreview: string;
      playbookRunId: string;
    }
  | { ok: false; error: string; code?: 'not_found' | 'rate_limited' };

const ACTIVATION_LIMIT = 10;
const ACTIVATION_WINDOW_SEC = 3600;

export function buildAbmPlaybookObjective(account: Pick<
  AbmAccountRow,
  'accountName' | 'domain' | 'industry' | 'intentScore' | 'buyerStage' | 'topics' | 'funnelStage'
>): string {
  const topics = account.topics.length ? account.topics.join(', ') : 'general';
  return [
    `ABM playbook for ${account.accountName} (${account.domain})`,
    `Industry: ${account.industry}`,
    `Intent: ${account.intentScore}/100 · Buyer stage: ${account.buyerStage} · Funnel: ${account.funnelStage}`,
    `Priority topics: ${topics}`,
    `Deliver bottom-of-funnel content when stage is decision; otherwise consideration/educational nurture.`,
  ].join('. ');
}

export async function checkActivationRateLimit(workspaceId: string): Promise<boolean> {
  try {
    const redis = getRedisClient();
    const key = `abm:activate:${workspaceId}:${Math.floor(Date.now() / (ACTIVATION_WINDOW_SEC * 1000))}`;
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, ACTIVATION_WINDOW_SEC);
    }
    return count <= ACTIVATION_LIMIT;
  } catch {
    return true;
  }
}

export async function activateAbmPlaybook(
  input: ActivatePlaybookInput,
): Promise<ActivatePlaybookResult> {
  const allowed = await checkActivationRateLimit(input.workspaceId);
  if (!allowed) {
    return { ok: false, error: 'Activation rate limit exceeded (10/hour per workspace)', code: 'rate_limited' };
  }

  const { data: row, error } = await supabaseAdmin
    .from('account_intent_scores')
    .select(
      'id, account_name, domain, industry, intent_score, buyer_stage, topics',
    )
    .eq('id', input.accountId)
    .eq('workspace_id', input.workspaceId)
    .maybeSingle();

  if (error || !row) {
    return { ok: false, error: 'Account not found', code: 'not_found' };
  }

  const topics = Array.isArray(row.topics) ? row.topics.map(String) : [];
  const buyerStage = String(row.buyer_stage) as AbmAccountRow['buyerStage'];
  const intentScore = Number(row.intent_score);
  const funnelStage =
    buyerStage === 'decision' ? 'BOFU' : buyerStage === 'consideration' ? 'MOFU' : 'TOFU';

  const account: Pick<
    AbmAccountRow,
    'accountName' | 'domain' | 'industry' | 'intentScore' | 'buyerStage' | 'topics' | 'funnelStage'
  > = {
    accountName: String(row.account_name),
    domain: String(row.domain),
    industry: String(row.industry ?? 'General'),
    intentScore,
    buyerStage,
    topics,
    funnelStage,
  };

  const objective = buildAbmPlaybookObjective(account);
  const locale = input.locale ?? 'en-US';

  const { data: agentConfig } = await supabaseAdmin
    .from('ai_agent_configs')
    .select('dify_app_api_key')
    .eq('workspace_id', input.workspaceId)
    .maybeSingle();

  const redis = getRedisClient();
  let jobId: string;
  try {
    const job = await createProcessingCampaignJob({
      redis,
      workspaceId: input.workspaceId,
      userId: input.userId,
      objective,
    });
    jobId = job.jobId;

    await sendAiCmoInngestEvent({
      name: AI_CMO_INNGEST_EVENT_NAMES.CAMPAIGN_REQUESTED,
      data: {
        jobId: job.jobId,
        workspaceId: input.workspaceId,
        userId: input.userId,
        objective,
        brandId: null,
        locale,
        persona: 'operator',
        workspaceDifyApiKey: agentConfig?.dify_app_api_key ?? null,
        idempotencyKey: randomUUID(),
        requestedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Failed to enqueue campaign',
    };
  }

  const syncResult = await secureSyncToSoR({
    table: SorTableNames.ABM_PLAYBOOK_RUNS,
    workspaceId: input.workspaceId,
    userId: input.userId,
    auditAction: 'abm.playbook.activated',
    auditMetadata: { accountIntentId: input.accountId, jobId },
    data: {
      workspace_id: input.workspaceId,
      account_intent_id: input.accountId,
      campaign_job_id: jobId,
      status: 'processing',
      objective_preview: objective.slice(0, 500),
      triggered_by: input.userId,
    },
  });

  if (!syncResult.ok) {
    return { ok: false, error: syncResult.error };
  }

  return {
    ok: true,
    jobId,
    pollUrl: `/api/v1/ai-cmo/campaigns/jobs/${jobId}`,
    objectivePreview: objective.slice(0, 500),
    playbookRunId: syncResult.id,
  };
}

export const activatePlaybookUtils = {
  buildAbmPlaybookObjective,
  activateAbmPlaybook,
  checkActivationRateLimit,
};
