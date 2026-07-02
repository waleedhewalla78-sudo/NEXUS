/**
 * Dify agent runtime client — execution only, not orchestration (PRD v3.0 Module A).
 * Workflows live in src/lib/orchestration/; this module invokes Dify apps per step.
 */

import { CircuitOpenError, getCircuitBreaker } from '@/lib/resilience/circuit-breaker';

export type DifyChatMessageInput = {
  query: string;
  userId: string;
  apiKey: string;
  baseUrl: string;
  inputs?: Record<string, string | number | boolean>;
  conversationId?: string;
};

export type DifyChatMessageResult =
  | { ok: true; answer: string; conversationId?: string }
  | { ok: false; error: string; status?: number };

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '');
}

export async function sendDifyChatMessage(input: DifyChatMessageInput): Promise<DifyChatMessageResult> {
  const base = normalizeBaseUrl(input.baseUrl);
  if (!base || !input.apiKey.trim()) {
    return { ok: false, error: 'Dify base URL and API key are required' };
  }

  const payload: Record<string, unknown> = {
    inputs: input.inputs ?? {},
    query: input.query,
    response_mode: 'blocking',
    user: input.userId,
  };

  if (input.conversationId) {
    payload.conversation_id = input.conversationId;
  }

  try {
    const breaker = getCircuitBreaker('dify', input.baseUrl);
    try {
      await breaker.assertClosed();
    } catch (error) {
      if (error instanceof CircuitOpenError) {
        return { ok: false, error: error.message };
      }
      throw error;
    }

    const response = await fetch(`${base}/v1/chat-messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${input.apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      await breaker.recordFailure();
      return { ok: false, error: errText || `Dify API error ${response.status}`, status: response.status };
    }

    const data = (await response.json()) as { answer?: string; conversation_id?: string };
    await breaker.recordSuccess();
    return {
      ok: true,
      answer: data.answer?.trim() ?? '',
      conversationId: data.conversation_id,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Dify request failed';
    const breaker = getCircuitBreaker('dify', input.baseUrl);
    await breaker.recordFailure();
    return { ok: false, error: message };
  }
}

export type DifyRuntimeConfig = {
  baseUrl: string | null;
  apiKey: string | null;
};

export function resolveDifyRuntimeConfig(options: {
  envBaseUrl?: string;
  envApiKey?: string;
  workspaceApiKey?: string | null;
}): DifyRuntimeConfig {
  const baseUrl = options.envBaseUrl?.replace(/\/+$/, '') ?? null;
  const apiKey = options.workspaceApiKey?.trim() || options.envApiKey?.trim() || null;
  return { baseUrl, apiKey };
}

export const difyClientUtils = {
  sendDifyChatMessage,
  resolveDifyRuntimeConfig,
};
