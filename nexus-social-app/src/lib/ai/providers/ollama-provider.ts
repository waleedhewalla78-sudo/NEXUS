/**
 * Feature 004 — Ollama ModelProvider (OpenAI-compatible local inference).
 * Opt-in via USE_LOCAL_OLLAMA=true; falls back via ProviderRouter when offline.
 */

import type { ModelProvider, ProviderGenerateOptions, ProviderResponse } from '@/lib/ai/providers/model-provider';
import { resolveOllamaModelForAgent, resolveOllamaTimeoutMs } from '@/lib/ai/ollama/agent-models';
import { getOllamaModelInventory, matchOllamaModelName } from '@/lib/ai/ollama/ollama-health';

const DEFAULT_TIMEOUT_MS = 120_000;

function isCloudModelName(model?: string): boolean {
  if (!model) return false;
  return /^(openai|anthropic|google|meta-llama|mistralai)\//i.test(model);
}

export function normalizeOllamaBaseUrl(raw: string): string {
  const trimmed = raw.replace(/\/+$/, '');
  return trimmed.endsWith('/v1') ? trimmed : `${trimmed}/v1`;
}

export class OllamaProvider implements ModelProvider {
  readonly id = 'ollama';

  async generate(options: ProviderGenerateOptions): Promise<ProviderResponse> {
    const startedAt = Date.now();
    const requested =
      options.model && !isCloudModelName(options.model)
        ? options.model
        : resolveOllamaModelForAgent(options.agentRole);
    const inventory = await getOllamaModelInventory();
    const model = matchOllamaModelName(requested, inventory) ?? requested;
    const baseUrl = normalizeOllamaBaseUrl(
      process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434',
    );
    const timeoutMs = options.timeoutMs ?? resolveOllamaTimeoutMs();

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [
            ...(options.systemPrompt
              ? [{ role: 'system' as const, content: options.systemPrompt }]
              : []),
            { role: 'user' as const, content: options.userPrompt },
          ],
          stream: false,
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        return {
          text: null,
          providerId: this.id,
          modelUsed: model,
          latencyMs: Date.now() - startedAt,
          error: `ollama_http_${response.status}${detail ? `: ${detail.slice(0, 120)}` : ''}`,
        };
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const text = data.choices?.[0]?.message?.content?.trim() ?? null;

      return {
        text: text || null,
        providerId: this.id,
        modelUsed: model,
        latencyMs: Date.now() - startedAt,
        error: text ? undefined : 'empty_response',
      };
    } catch (error) {
      return {
        text: null,
        providerId: this.id,
        modelUsed: model,
        latencyMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : 'ollama_connection_error',
      };
    }
  }
}

export const ollamaProvider = new OllamaProvider();
