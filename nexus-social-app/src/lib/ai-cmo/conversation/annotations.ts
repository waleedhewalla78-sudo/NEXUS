/**
 * Feature 006 Phase 2 — Pit Crew annotation → Memory/Qdrant (FR-088).
 * Uses learning_type `tone` (DB enum) with annotation_kind in context.
 */

import { persistConversationAnnotationLearning } from '@/lib/ai-cmo/conversation/persist';
import { supabaseAdmin } from '@/lib/supabase/server';

export type CaptureAnnotationInput = {
  workspaceId: string;
  userId?: string;
  conversationId: string;
  finalMessageText: string;
  humanEdited: boolean;
  similarityScore: number;
  /** Optional legacy ai_conversation_logs id */
  logId?: string | null;
};

export type CaptureAnnotationResult = {
  ok: boolean;
  learningId?: string;
  qualificationId?: string | null;
  skipped?: boolean;
  reason?: string;
};

export async function captureConversationAnnotation(
  input: CaptureAnnotationInput,
): Promise<CaptureAnnotationResult> {
  const { data: qual } = await supabaseAdmin
    .from('conversation_qualifications')
    .select('id, draft_reply, slots, inbound_text, metadata')
    .eq('workspace_id', input.workspaceId)
    .eq('conversation_id', String(input.conversationId))
    .maybeSingle();

  if (!qual && !input.logId) {
    return { ok: true, skipped: true, reason: 'no_qualification_or_log' };
  }

  const draftReply = (qual?.draft_reply as string | null) ?? null;
  const result = await persistConversationAnnotationLearning({
    workspaceId: input.workspaceId,
    userId: input.userId ?? 'system:conversation-annotation',
    context: {
      conversation_id: String(input.conversationId),
      qualification_id: qual?.id ?? null,
      log_id: input.logId ?? null,
      inbound_text: qual?.inbound_text ?? null,
      draft_reply: draftReply,
      slots: (qual?.slots as Record<string, unknown>) ?? {},
    },
    action: {
      human_edited: input.humanEdited,
      similarity_score: input.similarityScore,
    },
    outcome: {
      final_message_text: input.finalMessageText,
    },
    confidence: input.similarityScore,
  });

  if (!result.ok) {
    return { ok: false, reason: result.error ?? 'learning_persist_failed' };
  }

  return {
    ok: true,
    learningId: result.id,
    qualificationId: (qual?.id as string | undefined) ?? null,
  };
}
