/**
 * Shared LLM completion for inbox worker, captions, and Copilot (Ollama-first via ProviderRouter).
 */

import { providerRouter } from '@/lib/ai/providers/provider-router';
import { isLocalOllamaEnabled, isOllamaOnlyMode } from '@/lib/ai/ollama/agent-models';

export type SharedLlmResult = {
  text: string;
  provider: string;
  modelUsed: string;
  stubbed: boolean;
};

export async function completeViaProviderRouter(input: {
  systemPrompt: string;
  userPrompt: string;
  userId: string;
  agentRole: string;
  locale?: string;
}): Promise<SharedLlmResult> {
  const result = await providerRouter.generate({
    systemPrompt: input.systemPrompt,
    userPrompt: input.userPrompt,
    userId: input.userId,
    agentRole: input.agentRole,
    locale: input.locale,
  });

  return {
    text: result.text ?? '',
    provider: result.provider,
    modelUsed: result.modelUsed,
    stubbed: result.stubbed,
  };
}

export function shouldUseDifyFallback(): boolean {
  return !isLocalOllamaEnabled() || !isOllamaOnlyMode();
}
