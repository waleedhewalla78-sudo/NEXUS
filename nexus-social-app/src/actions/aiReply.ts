'use server';

import { supabaseAdmin } from '@/lib/supabase/server';
import { createActionClient } from '@/lib/supabase/action';
import { redactPII } from '@/utils/pii';
import { completeViaProviderRouter, shouldUseDifyFallback } from '@/lib/ai/shared-llm';
import { isLocalOllamaEnabled } from '@/lib/ai/ollama/agent-models';

function detectBuyingIntent(text: string): boolean {
  const keywords = ['pricing', 'cost', 'price', 'enterprise', 'demo', 'buy', 'purchase', 'quote', 'subscription'];
  const lowered = text.toLowerCase();
  return keywords.some((kw) => lowered.includes(kw));
}

const SUPPORT_SYSTEM_PROMPT =
  "Detect the customer's language. If Arabic, respond in Egyptian Colloquial Arabic (العامية المصرية). If English, respond in professional English. Write a concise, empathetic reply. Plain text only.";

export async function aiReply({
  workspaceId,
  conversationHistory,
  userQuery,
}: {
  workspaceId: string;
  conversationHistory: { content: string }[];
  userQuery: string;
}): Promise<{ reply: string }> {
  const supabase = await createActionClient();
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) {
    throw new Error('Unauthenticated');
  }

  const userId = session.user.id;

  const { data: memberData, error: memberErr } = await supabaseAdmin
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .single();

  if (memberErr || !memberData) {
    throw new Error('User not authorized for this workspace');
  }

  const { deductAiCredits } = await import('./billing');
  await deductAiCredits(workspaceId, 1);

  const redactedQuery = redactPII(userQuery);
  const thread = conversationHistory
    .slice(-5)
    .map((m, i) => `${i + 1}. ${redactPII(m.content)}`)
    .join('\n');

  let reply = '';

  if (isLocalOllamaEnabled()) {
    const llm = await completeViaProviderRouter({
      systemPrompt: SUPPORT_SYSTEM_PROMPT,
      userPrompt: thread ? `Conversation:\n${thread}\n\nLatest customer message: ${redactedQuery}` : redactedQuery,
      userId,
      agentRole: 'inbox',
    });
    if (llm.text) {
      reply = llm.text;
    } else if (!shouldUseDifyFallback()) {
      throw new Error(`Ollama inbox reply failed. Check ollama serve and OLLAMA_MODEL_INBOX.`);
    }
  }

  if (!reply) {
    const { data: agentConfig } = await supabaseAdmin
      .from('ai_agent_configs')
      .select('dify_app_api_key')
      .eq('workspace_id', workspaceId)
      .single();

    const difyKey = agentConfig?.dify_app_api_key || process.env.DIFY_API_KEY || '';
    const difyBase = process.env.DIFY_BASE_URL?.replace(/\/*$/, '') ?? '';

    if (!difyBase || !difyKey) {
      throw new Error(
        'No LLM configured. Set USE_LOCAL_OLLAMA=true or configure Dify in Settings → AI Agent.',
      );
    }

    const payload = {
      inputs: {},
      query: redactedQuery,
      response_mode: 'blocking',
      user: userId,
      conversation_id: `${workspaceId}:${userId}`,
    };

    const difyRes = await fetch(`${difyBase}/v1/chat-messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${difyKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!difyRes.ok) {
      const txt = await difyRes.text();
      throw new Error(`Dify request failed: ${difyRes.status} ${txt}`);
    }

    const difyData = await difyRes.json();
    reply = difyData.answer ?? difyData.response ?? '';
  }

  if (detectBuyingIntent(redactedQuery) || detectBuyingIntent(reply)) {
    const webhookUrl = process.env.ACTIVEPIECES_WEBHOOK_URL ?? '';
    if (webhookUrl) {
      const leadEmailMatch = userQuery.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspaceId,
          user_id: userId,
          lead_name: 'Unknown',
          lead_email: leadEmailMatch ? leadEmailMatch[0] : undefined,
          intent: 'buying',
          original_query: userQuery,
        }),
      });
    }
  }

  return { reply };
}
