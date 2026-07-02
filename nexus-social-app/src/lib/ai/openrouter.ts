const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'openai/gpt-4o-mini';

import { CircuitOpenError, getCircuitBreaker } from '@/lib/resilience/circuit-breaker';

export async function generateChatCompletion({
  systemPrompt,
  userPrompt,
  model = DEFAULT_MODEL,
}: {
  systemPrompt: string;
  userPrompt: string;
  model?: string;
}): Promise<string | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  const breaker = getCircuitBreaker('openrouter', model);

  try {
    await breaker.assertClosed();
  } catch (error) {
    if (error instanceof CircuitOpenError) {
      console.warn(`[OpenRouter] ${error.message}`);
      return null;
    }
    throw error;
  }

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3005',
        'X-Title': 'Nexus Social',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!res.ok) {
      console.warn(`[OpenRouter] request failed (${res.status})`);
      await breaker.recordFailure();
      return null;
    }

    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content?.trim() ?? null;
    if (content) {
      await breaker.recordSuccess();
    } else {
      await breaker.recordFailure();
    }
    return content;
  } catch (err) {
    console.warn('[OpenRouter] error', err);
    await breaker.recordFailure();
    return null;
  }
}

export async function generateCaptionViaOpenRouter(content: string): Promise<string | null> {
  return generateChatCompletion({
    systemPrompt:
      'You are an expert social media manager. Write a concise, engaging caption suitable for multiple networks.',
    userPrompt: content,
  });
}
