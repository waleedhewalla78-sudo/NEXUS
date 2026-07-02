/**
 * Re-exports canonical ProviderRouter from ai/providers (Phase 6).
 * Mesh agents import from here for stable path.
 */

export {
  ProviderRouter,
  providerRouter,
  providerRouterUtils,
} from '@/lib/ai/providers/provider-router';

export type {
  ProviderCompletionInput,
  ProviderCompletionResult,
} from '@/lib/ai/providers/provider-router';

export type { ModelProvider, ProviderResponse, RouterGenerateResult } from '@/lib/ai/providers/model-provider';
