'use server';

import { getUserWorkspaceContext } from '@/lib/auth/server-session';
import { campaignBriefSchema, type CampaignBriefInput } from '@/lib/ai-cmo/campaign-brief/schema';
import { enqueueCampaignFromBrief } from '@/lib/ai-cmo/campaign-brief/enqueue-from-brief';
import { getCampaignJob } from '@/lib/ai-cmo/campaign-job-store';
import { getRedisClient } from '@/lib/redis-client';

export async function submitCampaignBriefFromSession(
  raw: CampaignBriefInput,
): Promise<
  | { ok: true; jobId: string; assembledObjectivePreview: string }
  | { ok: false; error: string }
> {
  const parsed = campaignBriefSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join('; ') };
  }

  const { workspaceId, userId } = await getUserWorkspaceContext();
  const result = await enqueueCampaignFromBrief({
    workspaceId,
    userId,
    brief: parsed.data,
  });

  if (!result.ok) return result;
  return {
    ok: true,
    jobId: result.jobId,
    assembledObjectivePreview: result.assembledObjectivePreview,
  };
}

export async function pollCampaignJobFromSession(jobId: string): Promise<
  | {
      ok: true;
      status: string;
      campaignId?: string;
      error?: string;
      objective?: string;
    }
  | { ok: false; error: string }
> {
  const { workspaceId } = await getUserWorkspaceContext();
  const job = await getCampaignJob(getRedisClient(), jobId);

  if (!job) return { ok: false, error: 'Job not found' };
  if (job.workspaceId !== workspaceId) return { ok: false, error: 'Forbidden' };

  return {
    ok: true,
    status: job.status,
    campaignId: job.campaignId,
    error: job.error,
    objective: job.objective,
  };
}
