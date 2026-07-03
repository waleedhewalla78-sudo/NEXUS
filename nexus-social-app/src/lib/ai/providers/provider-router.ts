/**
 * Feature 004 Phase 6 — Provider strategy router (Dify → OpenRouter fallback).
 * Catches CircuitOpenError and provider failures; no vendor lock-in at call sites.
 */

import type { DataRegion } from '@/lib/db/schemas/agency-hierarchy';
import { AIProviderUnavailableError } from '@/lib/ai/errors';
import { isRegionCompliant } from '@/lib/governance/data-residency';
import { CircuitOpenError } from '@/lib/resilience/circuit-breaker';
import { DifyProvider } from '@/lib/ai/providers/dify-provider';
import { OllamaProvider } from '@/lib/ai/providers/ollama-provider';
import { OpenRouterProvider } from '@/lib/ai/providers/openrouter-provider';
import {
  isLocalOllamaEnabled,
  isOllamaOnlyMode,
  resolveOllamaModelForAgent,
} from '@/lib/ai/ollama/agent-models';
import type {
  ModelProvider,
  ProviderRouterConfig,
  RouterGenerateInput,
  RouterGenerateResult,
} from '@/lib/ai/providers/model-provider';

export type ProviderCompletionInput = RouterGenerateInput;
export type ProviderCompletionResult = RouterGenerateResult & {
  provider: 'ollama' | 'dify' | 'openrouter' | 'none';
};

const DEFAULT_ORDER = ['dify', 'openrouter'];

function isLocalOllamaEnabledFlag(): boolean {
  return isLocalOllamaEnabled();
}

function buildDefaultProviders(): ModelProvider[] {
  const providers: ModelProvider[] = [];
  if (isLocalOllamaEnabledFlag()) {
    providers.push(new OllamaProvider());
  }
  if (!isOllamaOnlyMode()) {
    providers.push(new DifyProvider(), new OpenRouterProvider());
  }
  return providers;
}

function buildDefaultProviderOrder(): string[] {
  if (isLocalOllamaEnabledFlag()) {
    return isOllamaOnlyMode() ? ['ollama'] : ['ollama', 'dify', 'openrouter'];
  }
  return DEFAULT_ORDER;
}

function resolveRequestModel(input: RouterGenerateInput, defaultModel: string): string {
  if (input.model && !input.model.includes('/')) {
    return input.model;
  }
  if (isLocalOllamaEnabledFlag() && input.agentRole) {
    return resolveOllamaModelForAgent(input.agentRole);
  }
  return input.model ?? defaultModel;
}

export class ProviderRouter {
  private readonly providers: Map<string, ModelProvider>;
  private readonly order: string[];
  private readonly defaultModel: string;

  constructor(
    config: ProviderRouterConfig = {},
    providers: ModelProvider[] = [new DifyProvider(), new OpenRouterProvider()],
  ) {
    this.providers = new Map(providers.map((p) => [p.id, p]));
    this.order = config.providerOrder ?? DEFAULT_ORDER;
    this.defaultModel = config.defaultModel ?? 'openai/gpt-4o-mini';
  }

  async generate(input: RouterGenerateInput): Promise<RouterGenerateResult> {
    if (input.tenantDataRegion) {
      const residency = isRegionCompliant(input.tenantDataRegion, 'llm_inference', 'global');
      if (!residency.compliant) {
        return {
          text: null,
          provider: 'none',
          modelUsed: 'blocked/residency',
          stubbed: true,
          attemptedProviders: [],
        };
      }
    }

    const attemptedProviders: string[] = [];

    for (const providerId of this.order) {
      const provider = this.providers.get(providerId);
      if (!provider) continue;

      attemptedProviders.push(providerId);

      try {
        const resolvedModel = resolveRequestModel(input, this.defaultModel);
        const response = await provider.generate({
          ...input,
          model: resolvedModel,
        });

        if (response.text) {
          return {
            text: response.text,
            provider: providerId,
            modelUsed: response.modelUsed,
            stubbed: false,
            attemptedProviders,
          };
        }
      } catch (error) {
        if (error instanceof CircuitOpenError) {
          console.warn(`[ProviderRouter] ${providerId} circuit open — falling back`);
          continue;
        }
        console.error(`[ProviderRouter] ${providerId} failed:`, error);
      }
    }

    // CLOSED: S16-T004 — fail fast in production so Inngest can retry safely
    if (attemptedProviders.length > 0) {
      console.error('[ProviderRouter] All AI providers unavailable', { attemptedProviders });
      if (process.env.NODE_ENV === 'production') {
        throw new AIProviderUnavailableError(attemptedProviders);
      }
    }

    return {
      text: null,
      provider: 'none',
      modelUsed: input.model ?? this.defaultModel,
      stubbed: true,
      attemptedProviders,
    };
  }

  /** Backward-compatible alias for mesh agents (Phase 7). */
  async complete(input: ProviderCompletionInput): Promise<ProviderCompletionResult> {
    const result = await this.generate(input);
    return {
      ...result,
      provider:
        result.provider === 'ollama' ||
        result.provider === 'dify' ||
        result.provider === 'openrouter'
          ? result.provider
          : 'none',
    };
  }
}

export const providerRouter = new ProviderRouter(
  { providerOrder: buildDefaultProviderOrder() },
  buildDefaultProviders(),
);

export const providerRouterUtils = {
  ProviderRouter,
  providerRouter,
};
