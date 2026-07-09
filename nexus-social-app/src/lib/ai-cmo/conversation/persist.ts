/**
 * Feature 006 Sprint 1 — Persist qualified leads via reconciler (additive).
 */

import { SorTableNames, type SyncToSoRResult } from '@/lib/ai-cmo/types/reconciler';
import { secureSyncToSoR } from '@/lib/ai-cmo/utils/secure-reconciler-writer';
import type { QualificationSlots } from '@/lib/ai-cmo/conversation/qualification';

export type PersistQualifiedLeadInput = {
  workspaceId: string;
  userId: string;
  qualificationId?: string | null;
  leadScoreId?: string | null;
  slots: QualificationSlots;
  accountDomain?: string | null;
  status?: 'new' | 'synced' | 'booked' | 'lost';
  metadata?: Record<string, unknown>;
};

export async function persistQualifiedLead(
  input: PersistQualifiedLeadInput,
): Promise<SyncToSoRResult> {
  return secureSyncToSoR({
    table: SorTableNames.QUALIFIED_LEADS,
    workspaceId: input.workspaceId,
    userId: input.userId,
    auditAction: 'conversation.qualified_lead.created',
    auditMetadata: { band: input.slots.intent ?? null },
    data: {
      workspace_id: input.workspaceId,
      qualification_id: input.qualificationId ?? null,
      lead_score_id: input.leadScoreId ?? null,
      contact_name: input.slots.contactName ?? null,
      contact_email: input.slots.contactEmail ?? null,
      contact_phone: input.slots.contactPhone ?? null,
      company: input.slots.company ?? null,
      slots: input.slots,
      account_domain: input.accountDomain ?? null,
      status: input.status ?? 'new',
      metadata: input.metadata ?? {},
    },
  });
}

export type PersistQualificationInput = {
  workspaceId: string;
  userId: string;
  conversationId: string;
  channel?: string;
  locale?: string;
  mode?: string;
  status?: string;
  inboundText: string;
  draftReply?: string | null;
  slots: QualificationSlots;
  confidence?: number | null;
  metadata?: Record<string, unknown>;
};

export async function persistConversationQualification(
  input: PersistQualificationInput,
): Promise<SyncToSoRResult> {
  return secureSyncToSoR({
    table: SorTableNames.CONVERSATION_QUALIFICATIONS,
    workspaceId: input.workspaceId,
    userId: input.userId,
    auditAction: 'conversation.qualification.upserted',
    data: {
      workspace_id: input.workspaceId,
      conversation_id: input.conversationId,
      channel: input.channel ?? 'whatsapp',
      locale: input.locale ?? 'ar-EG',
      mode: input.mode ?? 'shadow',
      status: input.status ?? 'drafting',
      inbound_text: input.inboundText,
      draft_reply: input.draftReply ?? null,
      slots: input.slots,
      confidence: input.confidence ?? null,
      metadata: input.metadata ?? {},
    },
  });
}

export type PersistEscalationInput = {
  workspaceId: string;
  userId: string;
  qualificationId: string;
  reason: string;
  sentiment?: 'negative' | 'neutral' | 'positive' | 'hostile' | null;
  contextPayload: Record<string, unknown>;
  chatwootAssignmentId?: string | null;
  status?: 'open' | 'accepted' | 'resolved' | 'cancelled';
};

export async function persistConversationEscalation(
  input: PersistEscalationInput,
): Promise<SyncToSoRResult> {
  return secureSyncToSoR({
    table: SorTableNames.CONVERSATION_ESCALATIONS,
    workspaceId: input.workspaceId,
    userId: input.userId,
    auditAction: 'conversation.escalation.created',
    auditMetadata: { reason: input.reason },
    data: {
      workspace_id: input.workspaceId,
      qualification_id: input.qualificationId,
      reason: input.reason,
      sentiment: input.sentiment ?? null,
      context_payload: input.contextPayload,
      chatwoot_assignment_id: input.chatwootAssignmentId ?? null,
      status: input.status ?? 'open',
    },
  });
}

export type PersistAnnotationLearningInput = {
  workspaceId: string;
  userId: string;
  context: Record<string, unknown>;
  action: Record<string, unknown>;
  outcome: Record<string, unknown>;
  confidence?: number | null;
};

/** Pit Crew annotation → Memory (tone bucket + conversation_annotation in context). */
export async function persistConversationAnnotationLearning(
  input: PersistAnnotationLearningInput,
): Promise<SyncToSoRResult> {
  return secureSyncToSoR({
    table: SorTableNames.AI_CMO_LEARNINGS,
    workspaceId: input.workspaceId,
    userId: input.userId,
    auditAction: 'conversation.annotation.captured',
    data: {
      workspace_id: input.workspaceId,
      learning_type: 'tone',
      context: {
        ...input.context,
        annotation_kind: 'conversation_annotation',
      },
      action: input.action,
      outcome: input.outcome,
      confidence: input.confidence ?? null,
    },
  });
}
