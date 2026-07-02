import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/api-auth';
import { createCampaignResponseSchema } from '@/lib/ai-cmo/types/campaign-api';
import { resolveApiWorkflowUserId } from '@/lib/ai-cmo/resolve-api-workflow-user';
import { campaignBriefSchema } from '@/lib/ai-cmo/campaign-brief/schema';
import { enqueueCampaignFromBrief } from '@/lib/ai-cmo/campaign-brief/enqueue-from-brief';

export async function POST(req: NextRequest) {
  const auth = await authenticateApiRequest(req);
  if (!auth.ok) return auth.response;

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = campaignBriefSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join('; ') },
      { status: 400 },
    );
  }

  const brief = parsed.data;

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

  const enqueued = await enqueueCampaignFromBrief({
    workspaceId: auth.workspaceId,
    userId,
    brief,
  });

  if (!enqueued.ok) {
    return NextResponse.json({ error: enqueued.error }, { status: 500 });
  }

  const response = createCampaignResponseSchema.parse({
    jobId: enqueued.jobId,
    status: 'processing',
    pollUrl: enqueued.pollUrl,
  });

  return NextResponse.json(
    { ...response, assembledObjectivePreview: enqueued.assembledObjectivePreview },
    { status: 202 },
  );
}
