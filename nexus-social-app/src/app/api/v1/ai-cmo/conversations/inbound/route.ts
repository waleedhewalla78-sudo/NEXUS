/**
 * Feature 006 Sprint 2 — Manual / poll API for conversation inbound (Shadow Mode).
 * POST enqueues Inngest event (202). GET returns latest qualification for conversation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { uuidLikeSchema } from '@/lib/validation/uuid-like';
import { requestConversationInbound } from '@/lib/orchestration/workflows/conversation-inbound-workflow';
import { processConversationInbound } from '@/lib/ai-cmo/conversation/process-inbound';
import { supabaseAdmin } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const postBodySchema = z.object({
  workspaceId: uuidLikeSchema,
  conversationId: z.string().min(1),
  inboundText: z.string().min(1),
  channel: z.enum(['whatsapp', 'chatwoot', 'web', 'other']).optional(),
  locale: z.string().optional(),
  messageId: z.string().optional(),
  /** ABM / audit thread metadata (FR-090). */
  metadata: z.record(z.string(), z.unknown()).optional(),
  /** When true, run inline (dev/UAT) instead of Inngest enqueue. */
  sync: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = postBodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const body = parsed.data;

  if (body.sync || process.env.CONVERSATION_INBOUND_SYNC === 'true') {
    const result = await processConversationInbound(body);
    return NextResponse.json(result, { status: result.ok ? 200 : 422 });
  }

  try {
    await requestConversationInbound(body);
    return NextResponse.json(
      {
        accepted: true,
        pollUrl: `/api/v1/ai-cmo/conversations/inbound?workspaceId=${encodeURIComponent(body.workspaceId)}&conversationId=${encodeURIComponent(body.conversationId)}`,
      },
      { status: 202 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[conversation/inbound] enqueue failed:', message);
    return NextResponse.json({ error: message }, { status: 503 });
  }
}

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get('workspaceId');
  const conversationId = req.nextUrl.searchParams.get('conversationId');
  if (!workspaceId || !conversationId) {
    return NextResponse.json(
      { error: 'workspaceId and conversationId query params required' },
      { status: 400 },
    );
  }

  const { data, error } = await supabaseAdmin
    .from('conversation_qualifications')
    .select('id, status, mode, draft_reply, slots, confidence, metadata, created_at, updated_at')
    .eq('workspace_id', workspaceId)
    .eq('conversation_id', conversationId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ found: false }, { status: 404 });
  }

  return NextResponse.json({ found: true, qualification: data });
}
