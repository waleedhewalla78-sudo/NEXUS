import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/resilience/circuit-breaker', () => ({
  CircuitOpenError: class CircuitOpenError extends Error {
    constructor(provider: string, model: string) {
      super(`Circuit open for ${provider}/${model}`);
      this.name = 'CircuitOpenError';
    }
  },
  getCircuitBreaker: () => ({
    assertClosed: async () => undefined,
    recordSuccess: async () => undefined,
    recordFailure: async () => undefined,
  }),
}));

import { sendDifyChatMessage, resolveDifyRuntimeConfig } from '@/lib/dify/client';

describe('dify client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('resolveDifyRuntimeConfig', () => {
    it('prefers workspace API key over env', () => {
      const config = resolveDifyRuntimeConfig({
        envBaseUrl: 'https://api.dify.ai',
        envApiKey: 'env-key',
        workspaceApiKey: 'workspace-key',
      });
      expect(config.baseUrl).toBe('https://api.dify.ai');
      expect(config.apiKey).toBe('workspace-key');
    });
  });

  describe('sendDifyChatMessage', () => {
    it('returns error when credentials missing', async () => {
      const result = await sendDifyChatMessage({
        baseUrl: '',
        apiKey: '',
        userId: 'user-1',
        query: 'hello',
      });
      expect(result.ok).toBe(false);
    });

    it('parses successful Dify response', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ answer: 'Strategic plan ready', conversation_id: 'conv-1' }),
        }),
      );

      const result = await sendDifyChatMessage({
        baseUrl: 'https://api.dify.ai',
        apiKey: 'app-key',
        userId: 'user-1',
        query: 'Plan Q3 campaign',
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.answer).toBe('Strategic plan ready');
        expect(result.conversationId).toBe('conv-1');
      }
    });
  });
});
