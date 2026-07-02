import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/api-auth';
import {
  ingestAttributionEvent,
  parseUtmParams,
} from '@/lib/ai-cmo/attribution/ingest';

export async function POST(req: NextRequest) {
  const auth = await authenticateApiRequest(req);
  if (!auth.ok) return auth.response;

  let body: {
    visitorId?: string;
    eventType?: 'page_view' | 'click' | 'signup' | 'demo_request' | 'purchase';
    campaignId?: string;
    contentId?: string;
    channel?: string;
    value?: number;
    isFirstTouch?: boolean;
    utmParams?: Record<string, unknown>;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const visitorId = body.visitorId?.trim() || req.headers.get('x-visitor-id')?.trim();
  if (!visitorId) {
    return NextResponse.json({ error: 'visitorId is required' }, { status: 400 });
  }

  const eventType = body.eventType ?? 'page_view';
  const userId = auth.requestHeaders.get('x-user-id') ?? `api-${auth.workspaceId}`;
  const utmFromQuery = parseUtmParams(req.nextUrl.searchParams);

  const result = await ingestAttributionEvent({
    workspaceId: auth.workspaceId,
    userId,
    visitorId,
    eventType,
    campaignId: body.campaignId ?? null,
    contentId: body.contentId ?? null,
    channel: body.channel ?? utmFromQuery.utm_source ?? null,
    utmParams: { ...utmFromQuery, ...(body.utmParams ?? {}) },
    value: body.value ?? null,
    isFirstTouch: body.isFirstTouch ?? false,
    agentName: 'attribution_webhook',
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  return NextResponse.json({ id: result.id, status: 'recorded' }, { status: 201 });
}
