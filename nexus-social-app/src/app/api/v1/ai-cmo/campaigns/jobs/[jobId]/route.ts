import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/api-auth';
import { getCampaignJob } from '@/lib/ai-cmo/campaign-job-store';
import { getRedisClient } from '@/lib/redis-client';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ jobId: string }> },
) {
  const auth = await authenticateApiRequest(req);
  if (!auth.ok) return auth.response;

  const { jobId } = await context.params;
  if (!jobId?.trim()) {
    return NextResponse.json({ error: 'jobId is required' }, { status: 400 });
  }

  try {
    const job = await getCampaignJob(getRedisClient(), jobId);

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.workspaceId !== auth.workspaceId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({
      jobId: job.jobId,
      status: job.status,
      objective: job.objective,
      campaignId: job.campaignId,
      result: job.result,
      error: job.error,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch job status';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
