/**
 * Feature 006 Phase 2 — Workspace conversation mode settings (FR-089).
 * Table PK is workspace_id (no separate id) — upsert via admin client + audit.
 */

import type { ConversationMode } from '@/lib/ai-cmo/conversation/qualification';
import { conversationModeSchema } from '@/lib/ai-cmo/conversation/qualification';
import { auditLog } from '@/lib/audit';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function getWorkspaceConversationMode(workspaceId: string): Promise<{
  mode: ConversationMode;
  localeDefault: string;
  complianceProfile: string;
  source: 'db' | 'default';
}> {
  const { data } = await supabaseAdmin
    .from('workspace_conversation_settings')
    .select('mode, locale_default, compliance_profile')
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  if (!data) {
    return {
      mode: 'shadow',
      localeDefault: 'ar-EG',
      complianceProfile: 'mena_conversational_v1',
      source: 'default',
    };
  }

  return {
    mode: (data.mode as ConversationMode) ?? 'shadow',
    localeDefault: (data.locale_default as string) ?? 'ar-EG',
    complianceProfile: (data.compliance_profile as string) ?? 'mena_conversational_v1',
    source: 'db',
  };
}

export async function setWorkspaceConversationMode(input: {
  workspaceId: string;
  userId: string;
  mode: ConversationMode;
  localeDefault?: string;
  complianceProfile?: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const parsed = conversationModeSchema.safeParse(input.mode);
  if (!parsed.success) {
    return { ok: false, error: 'invalid_mode' };
  }

  const existing = await getWorkspaceConversationMode(input.workspaceId);
  const row = {
    workspace_id: input.workspaceId,
    mode: parsed.data,
    locale_default: input.localeDefault ?? existing.localeDefault,
    compliance_profile: input.complianceProfile ?? existing.complianceProfile,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabaseAdmin
    .from('workspace_conversation_settings')
    .upsert(row, { onConflict: 'workspace_id' });

  if (error) {
    return { ok: false, error: error.message };
  }

  await auditLog(input.workspaceId, input.userId, 'conversation.mode.updated', {
    table: 'workspace_conversation_settings',
    from: existing.mode,
    to: parsed.data,
  });

  return { ok: true, id: input.workspaceId };
}
