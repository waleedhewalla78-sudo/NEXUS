import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { authenticateApiRequest } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { createProcessingCampaignJob, updateCampaignJob } from '@/lib/ai-cmo/campaign-job-store';
import { assertBudgetAvailable } from '@/lib/finops/budget-guard';
import { isBudgetExceededError } from '@/lib/governance/errors';
import {
  createCampaignRequestSchema,
  createCampaignResponseSchema,
} from '@/lib/ai-cmo/types/campaign-api';
import { sendAiCmoInngestEvent } from '@/lib/orchestration/inngest-client';
import { AI_CMO_INNGEST_EVENT_NAMES } from '@/lib/orchestration/types/events';
import { getRedisClient } from '@/lib/redis-client';
import { resolveApiWorkflowUserId } from '@/lib/ai-cmo/resolve-api-workflow-user';

export async function POST(req: NextRequest) {
  const auth = await authenticateApiRequest(req);
  if (!auth.ok) return auth.response;

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = createCampaignRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join('; ') },
      { status: 400 },
    );
  }

  const body = parsed.data;
  let userId: string;
  try {
    userId = await resolveApiWorkflowUserId(
      auth.workspaceId,
      auth.requestHeaders.get('x-user-id'),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not resolve workflow user';
    return NextResponse.json({ error: message }, { status: 503 });
  }

  const { data: agentConfig } = await supabaseAdmin
    .from('ai_agent_configs')
    .select('dify_app_api_key')
    .eq('workspace_id', auth.workspaceId)
    .maybeSingle();

  const redis = getRedisClient();
  try {
    const job = await createProcessingCampaignJob({
      redis,
      workspaceId: auth.workspaceId,
      userId,
      objective: body.objective,
      brandId: body.brandId ?? undefined,
    });

    try {
      await assertBudgetAvailable(auth.workspaceId);
    } catch (err) {
      if (isBudgetExceededError(err)) {
        const message = err instanceof Error ? err.message : 'Budget exceeded';
        await updateCampaignJob(redis, job.jobId, {
          status: 'failed',
          error: message,
          result: { status: 'rejected', reason: message },
        });
        const blocked = createCampaignResponseSchema.parse({
          jobId: job.jobId,
          status: 'processing',
          pollUrl: `/api/v1/ai-cmo/campaigns/jobs/${job.jobId}`,
        });
        return NextResponse.json(blocked, { status: 202 });
      }
      throw err;
    }

    const idempotencyKey = randomUUID();
    const requestedAt = new Date().toISOString();

    await sendAiCmoInngestEvent({
      name: AI_CMO_INNGEST_EVENT_NAMES.CAMPAIGN_REQUESTED,
      data: {
        jobId: job.jobId,
        workspaceId: auth.workspaceId,
        userId,
        objective: body.objective,
        brandId: body.brandId ?? null,
        brandName: body.brandName,
        locale: body.locale,
        persona: body.persona,
        workspaceDifyApiKey: agentConfig?.dify_app_api_key ?? null,
        idempotencyKey,
        requestedAt,
      },
    });

    const response = createCampaignResponseSchema.parse({
      jobId: job.jobId,
      status: 'processing',
      pollUrl: `/api/v1/ai-cmo/campaigns/jobs/${job.jobId}`,
    });

    return NextResponse.json(response, { status: 202 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to enqueue campaign workflow';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const auth = await authenticateApiRequest(req);
  if (!auth.ok) return auth.response;

  const { data, error } = await supabaseAdmin
    .from('ai_cmo_campaigns')
    .select('id, name, status, objective, brand_id, post_id, calibrated_confidence, created_at')
    .eq('workspace_id', auth.workspaceId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}
