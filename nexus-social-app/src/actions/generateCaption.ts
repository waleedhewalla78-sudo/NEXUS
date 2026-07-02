'use server';

import { supabaseAdmin } from '@/lib/supabase/server';
import { createActionClient } from '@/lib/supabase/action';
import { completeViaProviderRouter, shouldUseDifyFallback } from '@/lib/ai/shared-llm';
import { isLocalOllamaEnabled } from '@/lib/ai/ollama/agent-models';
import { generateCaptionViaOpenRouter } from '@/lib/ai/openrouter';

export async function generateCaption({
  workspaceId,
  content,
  conversationId,
}: {
  workspaceId: string;
  content: string;
  conversationId?: string;
}): Promise<string> {
  const supabase = await createActionClient();
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) throw new Error('Unauthenticated');

  const userId = session.user.id;

  const { data: member } = await supabaseAdmin
    .from('workspace_members')
    .select('id')
    .eq('user_id', userId)
    .eq('workspace_id', workspaceId)
    .single();

  if (!member) {
    throw new Error('User is not a member of the workspace');
  }

  const { deductAiCredits } = await import('./billing');
  await deductAiCredits(workspaceId, 1);

  if (isLocalOllamaEnabled()) {
    const llm = await completeViaProviderRouter({
      systemPrompt:
        'You are an expert social media manager. Generate a highly engaging social media caption based on the user prompt. Return caption text only.',
      userPrompt: content,
      userId,
      agentRole: 'caption',
    });
    if (llm.text) return llm.text;
    if (!shouldUseDifyFallback()) {
      throw new Error(`Ollama caption failed (${llm.provider}/${llm.modelUsed}). Is ollama serve running?`);
    }
  }

  const { data: aiSettings } = await supabaseAdmin
    .from('workspace_ai_settings')
    .select('fine_tuned_model_id, training_status')
    .eq('workspace_id', workspaceId)
    .single();

  const openAiKey = process.env.OPENAI_API_KEY;

  if (aiSettings && aiSettings.training_status === 'active' && aiSettings.fine_tuned_model_id && openAiKey) {
    try {
      const openAiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openAiKey}`,
        },
        body: JSON.stringify({
          model: aiSettings.fine_tuned_model_id,
          messages: [
            {
              role: 'system',
              content:
                "You are an expert social media manager mimicking the exact brand voice and style of this workspace's historical posts. Generate a highly engaging social media caption based on the user's prompt.",
            },
            { role: 'user', content },
          ],
        }),
      });

      if (openAiRes.ok) {
        const openAiData = await openAiRes.json();
        return openAiData.choices[0].message.content || '';
      }
      console.warn(`OpenAI fine-tuned model failed (${openAiRes.status}). Falling back.`);
    } catch (e) {
      console.error('OpenAI fine-tuned model error. Falling back.', e);
    }
  }

  const { data: agentConfig } = await supabaseAdmin
    .from('ai_agent_configs')
    .select('dify_app_api_key')
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  const DIFY_BASE_URL = process.env.DIFY_BASE_URL?.replace(/\/*$/, '');
  const DIFY_API_KEY = agentConfig?.dify_app_api_key || process.env.DIFY_API_KEY;

  if (!DIFY_BASE_URL || !DIFY_API_KEY) {
    const openRouterCaption = await generateCaptionViaOpenRouter(content);
    if (openRouterCaption) return openRouterCaption;
    throw new Error(
      'No LLM available. Set USE_LOCAL_OLLAMA=true, DIFY_API_KEY, or OPENROUTER_API_KEY in .env.local.',
    );
  }

  const payload: Record<string, unknown> = {
    inputs: {},
    query: content,
    response_mode: 'blocking',
    user: userId,
  };

  if (conversationId) {
    payload.conversation_id = conversationId;
  }

  const response = await fetch(`${DIFY_BASE_URL}/v1/chat-messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DIFY_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    const openRouterCaption = await generateCaptionViaOpenRouter(content);
    if (openRouterCaption) return openRouterCaption;
    throw new Error(`Dify API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  return data.answer || '';
}
