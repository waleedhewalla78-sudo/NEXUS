/**
 * Feature 004 Phase 6 — Unified LLM provider interface (vendor lock-in prevention).
 */

export type ProviderGenerateOptions = {
  systemPrompt?: string;
  userPrompt: string;
  userId: string;
  model?: string;
  agentRole?: string;
  locale?: string;
  timeoutMs?: number;
  difyBaseUrl?: string;
  difyApiKey?: string;
  workspaceDifyApiKey?: string | null;
};

export type ProviderResponse = {
  text: string | null;
  providerId: string;
  modelUsed: string;
  latencyMs: number;
  error?: string;
};

export interface ModelProvider {
  readonly id: string;
  generate(options: ProviderGenerateOptions): Promise<ProviderResponse>;
}

export type ProviderRouterConfig = {
  /** Provider IDs in fallback order (default: dify → openrouter). */
  providerOrder?: string[];
  defaultModel?: string;
};

export type RouterGenerateInput = ProviderGenerateOptions & {
  agentRole: string;
  tenantDataRegion?: import('@/lib/db/schemas/agency-hierarchy').DataRegion;
};

export type RouterGenerateResult = {
  text: string | null;
  provider: string;
  modelUsed: string;
  stubbed: boolean;
  attemptedProviders: string[];
};
