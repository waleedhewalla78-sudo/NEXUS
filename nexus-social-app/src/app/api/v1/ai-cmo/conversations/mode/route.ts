/**
 * Feature 006 Phase 2 — GET/PATCH workspace conversation mode (FR-089).
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { conversationModeSchema } from '@/lib/ai-cmo/conversation/qualification';
import {
  getWorkspaceConversationMode,
  setWorkspaceConversationMode,
} from '@/lib/ai-cmo/conversation/workspace-mode';
import { uuidLikeSchema } from '@/lib/validation/uuid-like';

export const runtime = 'nodejs';

const patchBodySchema = z.object({
  workspaceId: uuidLikeSchema,
  mode: conversationModeSchema,
  localeDefault: z.string().optional(),
  complianceProfile: z.string().optional(),
  userId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get('workspaceId');
  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId required' }, { status: 400 });
  }
  const settings = await getWorkspaceConversationMode(workspaceId);
  return NextResponse.json({ workspaceId, ...settings });
}

export async function PATCH(req: NextRequest) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = patchBodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const body = parsed.data;
  const result = await setWorkspaceConversationMode({
    workspaceId: body.workspaceId,
    userId: body.userId ?? 'system:conversation-mode',
    mode: body.mode,
    localeDefault: body.localeDefault,
    complianceProfile: body.complianceProfile,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? 'update_failed' }, { status: 422 });
  }

  const settings = await getWorkspaceConversationMode(body.workspaceId);
  return NextResponse.json({
    ok: true,
    id: result.id,
    workspaceId: body.workspaceId,
    ...settings,
  });
}
