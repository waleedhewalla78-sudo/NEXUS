import { NextRequest, NextResponse } from 'next/server';
import { activateAbmPlaybook } from '@/lib/ai-cmo/abm/activate-playbook';
import { resolveAbmWorkspaceId } from '@/lib/ai-cmo/abm/resolve-abm-workspace';
import { resolveApiWorkflowUserId } from '@/lib/ai-cmo/resolve-api-workflow-user';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/v1/ai-cmo/abm/accounts/[id]/activate
 * Enqueues ABM playbook → existing campaign workflow.
 */
export async function POST(req: NextRequest, context: RouteContext) {
  const resolved = await resolveAbmWorkspaceId(req);
  if ('response' in resolved) return resolved.response;

  const { id: accountId } = await context.params;
  if (!accountId?.trim()) {
    return NextResponse.json({ error: 'Account id required' }, { status: 400 });
  }

  let userId: string;
  try {
    userId = await resolveApiWorkflowUserId(
      resolved.workspaceId,
      req.headers.get('x-user-id'),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not resolve workflow user';
    return NextResponse.json({ error: message }, { status: 503 });
  }

  let locale = 'en-US';
  try {
    const body = await req.json();
    if (body?.locale && typeof body.locale === 'string') {
      locale = body.locale;
    }
  } catch {
    // empty body OK
  }

  const result = await activateAbmPlaybook({
    workspaceId: resolved.workspaceId,
    userId,
    accountId,
    locale,
  });

  if (!result.ok) {
    const status = result.code === 'not_found' ? 404 : result.code === 'rate_limited' ? 429 : 422;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json(
    {
      jobId: result.jobId,
      pollUrl: result.pollUrl,
      objectivePreview: result.objectivePreview,
      playbookRunId: result.playbookRunId,
      conversationSeed: result.conversationSeed,
      status: 'processing',
    },
    { status: 202 },
  );
}
