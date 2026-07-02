/**
 * Feature 004 Phase 6 — OpenRouter ModelProvider (circuit breaker inside openrouter.ts).
 */

import { generateChatCompletion } from '@/lib/ai/openrouter';
import { CircuitOpenError } from '@/lib/resilience/circuit-breaker';
import type { ModelProvider, ProviderGenerateOptions, ProviderResponse } from '@/lib/ai/providers/model-provider';

const DEFAULT_MODEL = 'openai/gpt-4o-mini';

export class OpenRouterProvider implements ModelProvider {
  readonly id = 'openrouter';

  async generate(options: ProviderGenerateOptions): Promise<ProviderResponse> {
    const startedAt = Date.now();
    const model = options.model ?? DEFAULT_MODEL;

    if (!process.env.OPENROUTER_API_KEY) {
      return {
        text: null,
        providerId: this.id,
        modelUsed: model,
        latencyMs: Date.now() - startedAt,
        error: 'openrouter_not_configured',
      };
    }

    try {
      const text = await generateChatCompletion({
        systemPrompt: options.systemPrompt ?? 'You are a helpful assistant.',
        userPrompt: options.userPrompt,
        model,
      });

      return {
        text,
        providerId: this.id,
        modelUsed: model,
        latencyMs: Date.now() - startedAt,
        error: text ? undefined : 'empty_response',
      };
    } catch (error) {
      if (error instanceof CircuitOpenError) {
        throw error;
      }
      return {
        text: null,
        providerId: this.id,
        modelUsed: model,
        latencyMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : 'openrouter_error',
      };
    }
  }
}

export const openRouterProvider = new OpenRouterProvider();
