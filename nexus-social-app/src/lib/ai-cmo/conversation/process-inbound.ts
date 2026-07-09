/**
 * Feature 006 Sprint 2 — Pure conversation inbound processor (testable without Inngest).
 * Concierge drafts in Shadow Mode; does not auto-send to Chatwoot (FR-086).
 */

import { conciergeAgent } from '@/lib/ai-cmo/agents/concierge-agent';
import {
  persistConversationQualification,
  persistQualifiedLead,
} from '@/lib/ai-cmo/conversation/persist';
import { resolveConversationMode, shouldAutoSendReply } from '@/lib/ai-cmo/conversation/shadow-mode';
import { supabaseAdmin } from '@/lib/supabase/server';

export const CONVERSATION_INBOUND_EVENT = 'ai-cmo/conversation.inbound' as const;

export type ConversationInboundInput = {
  workspaceId: string;
  userId?: string;
  conversationId: string;
  inboundText: string;
  channel?: 'whatsapp' | 'chatwoot' | 'web' | 'other';
  locale?: string;
  messageId?: string;
  metadata?: Record<string, unknown>;
};

export type ConversationInboundResult = {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  qualificationId?: string;
  leadId?: string;
  mode?: string;
  draftReply?: string;
  score?: number;
  band?: string;
  autoSend?: boolean;
  accountDomain?: string;
};

async function loadWorkspaceMode(workspaceId: string) {
  const { data } = await supabaseAdmin
    .from('workspace_conversation_settings')
    .select('mode, locale_default, compliance_profile')
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  return data
    ? {
        workspaceId,
        mode: data.mode as 'shadow' | 'ai_active' | 'off',
        localeDefault: data.locale_default as string,
        complianceProfile: data.compliance_profile as string,
      }
    : null;
}

export async function processConversationInbound(
  input: ConversationInboundInput,
): Promise<ConversationInboundResult> {
  const text = input.inboundText?.trim();
  if (!text) {
    return { ok: false, skipped: true, reason: 'empty_inbound' };
  }

  const settings = await loadWorkspaceMode(input.workspaceId);
  const mode = resolveConversationMode(settings);
  if (mode === 'off') {
    return { ok: true, skipped: true, reason: 'conversation_mode_off', mode };
  }

  const locale = input.locale ?? settings?.localeDefault ?? 'ar-EG';
  const userId = input.userId ?? 'system:conversation-inbound';

  const agentOut = await conciergeAgent.run({
    workspaceId: input.workspaceId,
    userId,
    inboundText: text,
    conversationId: input.conversationId,
    locale,
    metadata: input.metadata,
    rulesOnly: process.env.CONCIERGE_RULES_ONLY === 'true' ? true : undefined,
  });

  const proposal = agentOut.proposal;
  const autoSend = shouldAutoSendReply(mode);

  const qual = await persistConversationQualification({
    workspaceId: input.workspaceId,
    userId,
    conversationId: String(input.conversationId),
    channel: input.channel ?? 'chatwoot',
    locale,
    mode,
    status: autoSend ? 'qualified' : 'pending_human',
    inboundText: text,
    draftReply: proposal.draftReply,
    slots: proposal.slots,
    confidence: proposal.score / 100,
    metadata: {
      ...(input.metadata ?? {}),
      messageId: input.messageId ?? null,
      band: proposal.band,
      reasons: proposal.reasons,
      autoSend,
      llmStubbed: agentOut.llmStubbed,
    },
  });

  if (!qual.ok) {
    return {
      ok: false,
      reason: 'qualification_persist_failed',
      mode,
      draftReply: proposal.draftReply,
    };
  }

  let leadId: string | undefined;
  const accountDomain = proposal.accountDomain ?? null;
  if (proposal.band === 'qualified' || proposal.band === 'hot') {
    const lead = await persistQualifiedLead({
      workspaceId: input.workspaceId,
      userId,
      qualificationId: qual.id ?? null,
      slots: proposal.slots,
      accountDomain,
      status: 'new',
      metadata: {
        band: proposal.band,
        score: proposal.score,
        accountDomain,
        llmStubbed: agentOut.llmStubbed,
        modelUsed: agentOut.modelUsed ?? null,
      },
    });
    if (lead.ok) leadId = lead.id;
  }

  return {
    ok: true,
    qualificationId: qual.id,
    leadId,
    mode,
    draftReply: proposal.draftReply,
    score: proposal.score,
    band: proposal.band,
    autoSend,
    accountDomain: accountDomain ?? undefined,
  };
}
