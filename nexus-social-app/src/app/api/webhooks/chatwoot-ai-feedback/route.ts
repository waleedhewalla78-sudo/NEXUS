import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyChatwootWebhook } from '@/lib/webhook-auth';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Task 3: Human Feedback Loop
 * Listens for message_updated webhooks to capture human edits to AI drafts.
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

    // 2. Fetch the original AI draft for this conversation
    const { data: log, error: logError } = await supabaseAdmin
      .from('ai_conversation_logs')
      .select('id, ai_response')
      .eq('workspace_id', mapping.workspace_id)
      .eq('external_conversation_id', String(conversationId))
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (logError || !log) return NextResponse.json({ status: 'no_ai_log_found' }, { status: 200 });

    // 3. Prevent duplicate feedback entries for the same log
    const { data: existingFeedback } = await supabaseAdmin
      .from('ai_feedback')
      .select('id')
      .eq('log_id', log.id)
      .single();

    if (existingFeedback) return NextResponse.json({ status: 'already_captured' }, { status: 200 });

    // 4. Calculate Similarity
    const originalDraft = log.ai_response.replace('[ESCALATE_TO_HUMAN]', '').trim();
    const similarityScore = calculateSimilarity(originalDraft, finalMessageText.trim());
    const humanEdited = similarityScore < 0.95; // 95% similarity threshold

    // 5. Insert Feedback
    await supabaseAdmin.from('ai_feedback').insert({
      workspace_id: mapping.workspace_id,
      log_id: log.id,
      human_edited: humanEdited,
      similarity_score: similarityScore,
      final_message_text: finalMessageText
    });

    return NextResponse.json({ status: 'feedback_captured', similarity: similarityScore });

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
