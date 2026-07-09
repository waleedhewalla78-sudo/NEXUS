/**
 * Feature 006 — Conversation inbound processor.
 * Phase 1: Concierge + Shadow drafts.
 * Phase 2: Escalation (FR-087) + AI-Active send (FR-089).
 */

import { conciergeAgent } from '@/lib/ai-cmo/agents/concierge-agent';
import { decideEscalation } from '@/lib/ai-cmo/conversation/escalation';
import {
  persistConversationEscalation,
  persistConversationQualification,
  persistQualifiedLead,
} from '@/lib/ai-cmo/conversation/persist';
import { resolveConversationMode, shouldAutoSendReply } from '@/lib/ai-cmo/conversation/shadow-mode';
import {
  buildEscalationNote,
  deliverConciergeDraft,
  escalateToHuman,
} from '@/lib/chatwoot/escalation-adapter';
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
  escalationId?: string;
  mode?: string;
  draftReply?: string;
  score?: number;
  band?: string;
  autoSend?: boolean;
  escalated?: boolean;
  deliveryChannel?: 'public' | 'private_note' | 'escalation' | 'none';
  accountDomain?: string;
};

export async function loadWorkspaceMode(workspaceId: string) {
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
    metadata: {
      ...(input.metadata ?? {}),
      conversationMode: mode,
    },
    rulesOnly: process.env.CONCIERGE_RULES_ONLY === 'true' ? true : undefined,
  });

  const proposal = agentOut.proposal;
  const confidence = proposal.score / 100;
  const escalation = decideEscalation({
    inboundText: text,
    confidence,
    draftReply: proposal.draftReply,
  });

  const autoSend = !escalation.shouldEscalate && shouldAutoSendReply(mode);
  const status = escalation.shouldEscalate
    ? 'escalated'
    : autoSend
      ? 'qualified'
      : 'pending_human';

  const qual = await persistConversationQualification({
    workspaceId: input.workspaceId,
    userId,
    conversationId: String(input.conversationId),
    channel: input.channel ?? 'chatwoot',
    locale,
    mode,
    status,
    inboundText: text,
    draftReply: proposal.draftReply,
    slots: proposal.slots,
    confidence,
    metadata: {
      ...(input.metadata ?? {}),
      messageId: input.messageId ?? null,
      band: proposal.band,
      reasons: proposal.reasons,
      autoSend,
      escalated: escalation.shouldEscalate,
      escalationReason: escalation.reason,
      sentiment: escalation.sentiment,
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
  let escalationId: string | undefined;
  let deliveryChannel: ConversationInboundResult['deliveryChannel'] = 'none';
  const accountDomain = proposal.accountDomain ?? null;

  if (escalation.shouldEscalate && qual.id) {
    const contextPayload = {
      conversationId: String(input.conversationId),
      inboundText: text,
      draftReply: proposal.draftReply,
      slots: proposal.slots,
      score: proposal.score,
      band: proposal.band,
      confidence,
      sentiment: escalation.sentiment,
      reason: escalation.reason,
      abmPlaybookRunId: input.metadata?.abmPlaybookRunId ?? null,
      accountDomain: accountDomain ?? input.metadata?.accountDomain ?? null,
      accountIntentId: input.metadata?.accountIntentId ?? null,
    };

    const note = buildEscalationNote({
      reason: escalation.reason ?? 'escalation',
      draftReply: proposal.draftReply,
      slots: proposal.slots as Record<string, unknown>,
      inboundText: text,
      confidence,
    });

    const assign = await escalateToHuman({
      conversationId: input.conversationId,
      noteContent: note,
    });

    const escPersist = await persistConversationEscalation({
      workspaceId: input.workspaceId,
      userId,
      qualificationId: qual.id,
      reason: escalation.reason ?? 'escalation',
      sentiment: escalation.sentiment,
      contextPayload,
      chatwootAssignmentId: assign.assignmentId ?? null,
      status: 'open',
    });
    if (escPersist.ok) escalationId = escPersist.id;
    deliveryChannel = 'escalation';
  } else {
    const delivery = await deliverConciergeDraft({
      conversationId: input.conversationId,
      draftReply: proposal.draftReply,
      autoSend,
    });
    deliveryChannel = delivery.channel;
  }

  if (
    !escalation.shouldEscalate &&
    (proposal.band === 'qualified' || proposal.band === 'hot')
  ) {
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
        abmPlaybookRunId: input.metadata?.abmPlaybookRunId ?? null,
        accountIntentId: input.metadata?.accountIntentId ?? null,
        campaignJobId: input.metadata?.campaignJobId ?? null,
      },
    });
    if (lead.ok) leadId = lead.id;
  }

  return {
    ok: true,
    qualificationId: qual.id,
    leadId,
    escalationId,
    mode,
    draftReply: proposal.draftReply,
    score: proposal.score,
    band: proposal.band,
    autoSend,
    escalated: escalation.shouldEscalate,
    deliveryChannel,
    accountDomain: accountDomain ?? undefined,
  };
}
