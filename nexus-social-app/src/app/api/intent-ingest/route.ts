import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/api-auth';
import { ingestIntentScores } from '@/lib/ai-cmo/abm/intent-ingest';

/**
 * Generic intent provider ingest — Bombora, Clearbit, etc.
 * POST /api/intent-ingest
 *
 * Body: { domain, topics?, topic?, score, source? }
 */
export async function POST(req: NextRequest) {
  const auth = await authenticateApiRequest(req);
  if (!auth.ok) return auth.response;

  let body: {
    domain?: string;
    topics?: string[];
    topic?: string;
    score?: number;
    source?: string;
    organizationId?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.domain?.trim()) {
    return NextResponse.json({ error: 'domain is required' }, { status: 400 });
  }

  if (body.score == null || Number.isNaN(Number(body.score))) {
    return NextResponse.json({ error: 'score is required (1–100)' }, { status: 400 });
  }

  const userId = auth.requestHeaders.get('x-user-id') ?? `api-${auth.workspaceId}`;

  const result = await ingestIntentScores({
    workspaceId: auth.workspaceId,
    userId,
    payload: {
      domain: body.domain,
      topics: body.topics,
      topic: body.topic,
      score: Number(body.score),
      source: body.source,
    },
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  return NextResponse.json({ id: result.id, status: 'upserted' }, { status: 201 });
}
