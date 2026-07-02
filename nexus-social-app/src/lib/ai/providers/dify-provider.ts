/**
 * Feature 004 Phase 6 — Dify ModelProvider (circuit breaker inside dify/client).
 */

import { sendDifyChatMessage, resolveDifyRuntimeConfig } from '@/lib/dify/client';
import { CircuitOpenError } from '@/lib/resilience/circuit-breaker';
import type { ModelProvider, ProviderGenerateOptions, ProviderResponse } from '@/lib/ai/providers/model-provider';

export class DifyProvider implements ModelProvider {
  readonly id = 'dify';

  async generate(options: ProviderGenerateOptions): Promise<ProviderResponse> {
    const startedAt = Date.now();
    const { baseUrl, apiKey } = resolveDifyRuntimeConfig({
      envBaseUrl: options.difyBaseUrl ?? process.env.DIFY_BASE_URL,
      envApiKey: options.difyApiKey ?? process.env.DIFY_API_KEY,
      workspaceApiKey: options.workspaceDifyApiKey,
    });

    if (!baseUrl || !apiKey) {
      return {
        text: null,
        providerId: this.id,
        modelUsed: `dify/${options.agentRole ?? 'agent'}`,
        latencyMs: Date.now() - startedAt,
        error: 'dify_not_configured',
      };
    }

    try {
      const result = await sendDifyChatMessage({
        baseUrl,
        apiKey,
        userId: options.userId,
        query: options.userPrompt,
        inputs: {
          agent_role: options.agentRole ?? 'agent',
          locale: options.locale ?? 'en-US',
          ...(options.systemPrompt ? { system_prompt: options.systemPrompt } : {}),
        },
      });

      if (result.ok && result.answer) {
        return {
          text: result.answer,
          providerId: this.id,
          modelUsed: `dify/${options.agentRole ?? 'agent'}`,
          latencyMs: Date.now() - startedAt,
        };
      }

      return {
        text: null,
        providerId: this.id,
        modelUsed: `dify/${options.agentRole ?? 'agent'}`,
        latencyMs: Date.now() - startedAt,
        error: result.ok ? 'empty_response' : result.error,
      };
    } catch (error) {
      if (error instanceof CircuitOpenError) {
        throw error;
      }
      return {
        text: null,
        providerId: this.id,
        modelUsed: `dify/${options.agentRole ?? 'agent'}`,
        latencyMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : 'dify_error',
      };
    }
  }
}

export const difyProvider = new DifyProvider();
