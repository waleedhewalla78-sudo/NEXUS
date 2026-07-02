import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendMessage } from '@/lib/chatwoot/client';
import { verifyChatwootWebhook } from '@/lib/webhook-auth';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();

    if (!verifyChatwootWebhook(req, rawBody)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const payload = JSON.parse(rawBody);

    // 1. Detect Conversation Resolution
    if (payload.event === 'conversation_updated' && payload.status === 'resolved') {
      const conversationId = payload.id;
      // Send CSAT Survey
      await sendMessage(conversationId, 'This conversation has been closed. How would you rate your experience with us from 1 to 5? (1 = Poor, 5 = Excellent)');
      return NextResponse.json({ status: 'csat_sent' });
    }

    // 2. Detect CSAT Reply (Message created containing only a number 1-5)
    if (payload.event === 'message_created' && payload.message_type === 0) { // incoming message
      const content = payload.content ? payload.content.trim() : '';
      if (/^[1-5]$/.test(content)) {
        const score = parseInt(content, 10);
        const conversationId = payload.conversation.id;
        
        // Find workspace_id from conversation/inbox map (simulated lookup)
        const { data: mapData } = await supabaseAdmin
          .from('chatwoot_inbox_workspace_map')
          .select('workspace_id')
          .eq('chatwoot_inbox_id', payload.conversation.inbox_id)
          .single();

        if (mapData) {
          await supabaseAdmin.from('csat_scores').insert({
            workspace_id: mapData.workspace_id,
            conversation_id: String(conversationId),
            score: score
          });
          
          await sendMessage(conversationId, 'Thank you for your feedback! Have a great day.');
          return NextResponse.json({ status: 'csat_recorded' });
        }
      }
    }

    return NextResponse.json({ status: 'ignored' });
  } catch (error) {
    console.error('CSAT Webhook Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
