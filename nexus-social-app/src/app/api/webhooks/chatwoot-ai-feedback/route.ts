import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { captureConversationAnnotation } from '@/lib/ai-cmo/conversation/annotations';
import { verifyChatwootWebhook } from '@/lib/webhook-auth';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Task 3 + Feature 006 T017: Human Feedback Loop
 * Captures human edits to AI drafts → ai_feedback + Memory (ai_cmo_learnings → Qdrant).
 */
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();

    if (!verifyChatwootWebhook(req, rawBody)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const payload = JSON.parse(rawBody);

    // Edge Case 4: Only capture feedback when the message is fully sent
    if (payload.event !== 'message_updated' || payload.message_type !== 'outgoing' || payload.status !== 'sent') {
      return NextResponse.json({ status: 'ignored' }, { status: 200 });
    }

    const conversationId = payload.conversation.id;
    const finalMessageText = payload.content;

    // 1. Map Chatwoot conversation to Workspace
    const { data: mapping } = await supabaseAdmin
      .from('chatwoot_inbox_workspace_map')
      .select('workspace_id')
      .eq('chatwoot_inbox_id', payload.inbox?.id ?? payload.conversation?.inbox_id)
      .single();

    if (!mapping) return NextResponse.json({ status: 'unmapped_inbox' }, { status: 200 });

    // 2. Prefer Concierge qualification draft; fall back to legacy ai_conversation_logs
    const { data: qual } = await supabaseAdmin
      .from('conversation_qualifications')
      .select('id, draft_reply')
      .eq('workspace_id', mapping.workspace_id)
      .eq('conversation_id', String(conversationId))
      .maybeSingle();

    const { data: log } = await supabaseAdmin
      .from('ai_conversation_logs')
      .select('id, ai_response')
      .eq('workspace_id', mapping.workspace_id)
      .eq('external_conversation_id', String(conversationId))
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!qual && !log) {
      return NextResponse.json({ status: 'no_ai_log_found' }, { status: 200 });
    }

    // 3. Prevent duplicate feedback entries for the same log (legacy path)
    if (log) {
      const { data: existingFeedback } = await supabaseAdmin
        .from('ai_feedback')
        .select('id')
        .eq('log_id', log.id)
        .maybeSingle();

      if (existingFeedback) {
        return NextResponse.json({ status: 'already_captured' }, { status: 200 });
      }
    }

    // 4. Calculate Similarity against Concierge draft or legacy AI response
    const originalDraft = (
      (qual?.draft_reply as string | null) ??
      (log?.ai_response as string | undefined) ??
      ''
    )
      .replace('[ESCALATE_TO_HUMAN]', '')
      .trim();
    const similarityScore = calculateSimilarity(originalDraft, finalMessageText.trim());
    const humanEdited = similarityScore < 0.95;

    // 5. Insert Feedback (legacy table when log exists)
    if (log) {
      await supabaseAdmin.from('ai_feedback').insert({
        workspace_id: mapping.workspace_id,
        log_id: log.id,
        human_edited: humanEdited,
        similarity_score: similarityScore,
        final_message_text: finalMessageText,
      });
    }

    // 6. Feature 006 — Memory annotation (triggers Qdrant via reconciler hook)
    const annotation = await captureConversationAnnotation({
      workspaceId: mapping.workspace_id,
      conversationId: String(conversationId),
      finalMessageText,
      humanEdited,
      similarityScore,
      logId: log?.id ?? null,
    });

    return NextResponse.json({
      status: 'feedback_captured',
      similarity: similarityScore,
      annotationLearningId: annotation.learningId ?? null,
      qualificationId: annotation.qualificationId ?? qual?.id ?? null,
    });

  } catch (error: any) {
    console.error('[Webhook AI Feedback Error]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Calculates Levenshtein-based similarity (0.0 to 1.0)
 */
function calculateSimilarity(a: string, b: string): number {
  if (a.length === 0 && b.length === 0) return 1.0;
  if (a.length === 0 || b.length === 0) return 0.0;
  
  const distance = levenshteinDistance(a, b);
  const maxLength = Math.max(a.length, b.length);
  return 1.0 - (distance / maxLength);
}

function levenshteinDistance(a: string, b: string): number {
  const matrix = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
  
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[a.length][b.length];
}
