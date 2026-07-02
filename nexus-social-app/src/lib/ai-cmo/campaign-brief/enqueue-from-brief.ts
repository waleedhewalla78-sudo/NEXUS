import { randomUUID } from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabase/server';
import { createProcessingCampaignJob } from '@/lib/ai-cmo/campaign-job-store';
import { sendAiCmoInngestEvent } from '@/lib/orchestration/inngest-client';
import { AI_CMO_INNGEST_EVENT_NAMES } from '@/lib/orchestration/types/events';
import { getRedisClient } from '@/lib/redis-client';
import { assembleCampaignObjectiveFromBrief } from '@/lib/ai-cmo/campaign-brief/assemble-objective';
import type { CampaignBriefInput } from '@/lib/ai-cmo/campaign-brief/schema';

export type EnqueueBriefResult =
  | { ok: true; jobId: string; pollUrl: string; assembledObjectivePreview: string }
  | { ok: false; error: string };

export async function enqueueCampaignFromBrief(input: {
  workspaceId: string;
  userId: string;
  brief: CampaignBriefInput;
}): Promise<EnqueueBriefResult> {
  const objective = assembleCampaignObjectiveFromBrief(input.brief);

  const { data: agentConfig } = await supabaseAdmin
    .from('ai_agent_configs')
    .select('dify_app_api_key')
    .eq('workspace_id', input.workspaceId)
    .maybeSingle();

  const redis = getRedisClient();
  try {
    const job = await createProcessingCampaignJob({
      redis,
      workspaceId: input.workspaceId,
      userId: input.userId,
      objective,
      brandId: input.brief.brandId,
    });

    await sendAiCmoInngestEvent({
      name: AI_CMO_INNGEST_EVENT_NAMES.CAMPAIGN_REQUESTED,
      data: {
        jobId: job.jobId,
        workspaceId: input.workspaceId,
        userId: input.userId,
        objective,
        brandId: input.brief.brandId ?? null,
        brandName: input.brief.brandName ?? undefined,
        locale: input.brief.locale,
        persona: (input.brief.persona as 'executive' | 'operator' | 'compliance' | undefined) ?? undefined,
        targetAccountId: input.brief.targetAccountId ?? undefined,
        workspaceDifyApiKey: agentConfig?.dify_app_api_key ?? null,
        idempotencyKey: randomUUID(),
        requestedAt: new Date().toISOString(),
      },
    });

    return {
      ok: true,
      jobId: job.jobId,
      pollUrl: `/api/v1/ai-cmo/campaigns/jobs/${job.jobId}`,
      assembledObjectivePreview: objective.slice(0, 500),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to enqueue campaign workflow';
    return { ok: false, error: message };
  }
}
