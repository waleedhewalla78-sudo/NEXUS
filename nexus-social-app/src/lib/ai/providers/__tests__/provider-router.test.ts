import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ProviderRouter } from '@/lib/ai/providers/provider-router';
import { CircuitOpenError } from '@/lib/resilience/circuit-breaker';
import type { ModelProvider, ProviderGenerateOptions, ProviderResponse } from '@/lib/ai/providers/model-provider';

class StubProvider implements ModelProvider {
  constructor(
    readonly id: string,
    private readonly behavior: 'success' | 'fail' | 'circuit',
  ) {}

  async generate(_options: ProviderGenerateOptions): Promise<ProviderResponse> {
    if (this.behavior === 'circuit') {
      throw new CircuitOpenError('dify', 'test');
    }
    if (this.behavior === 'fail') {
      return {
        text: null,
        providerId: this.id,
        modelUsed: `${this.id}/test`,
        latencyMs: 1,
        error: 'empty',
      };
    }
    return {
      text: `response from ${this.id}`,
      providerId: this.id,
      modelUsed: `${this.id}/test`,
      latencyMs: 1,
    };
  }
}

describe('ProviderRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('falls back to OpenRouter when Dify circuit is open', async () => {
    const router = new ProviderRouter({}, [
      new StubProvider('dify', 'circuit'),
      new StubProvider('openrouter', 'success'),
    ]);

    const result = await router.generate({
      userPrompt: 'hello',
      userId: 'user-1',
      agentRole: 'creator',
    });

    expect(result.provider).toBe('openrouter');
    expect(result.text).toBe('response from openrouter');
    expect(result.attemptedProviders).toEqual(['dify', 'openrouter']);
  });

  it('returns stubbed when all providers fail', async () => {
    const router = new ProviderRouter({}, [
      new StubProvider('dify', 'fail'),
      new StubProvider('openrouter', 'fail'),
    ]);

    const result = await router.generate({
      userPrompt: 'hello',
      userId: 'user-1',
      agentRole: 'creator',
    });

    expect(result.stubbed).toBe(true);
    expect(result.text).toBeNull();
  });

  it('throws AIProviderUnavailableError in production when all providers fail', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const router = new ProviderRouter({}, [
      new StubProvider('dify', 'fail'),
      new StubProvider('openrouter', 'fail'),
    ]);

    await expect(
      router.generate({
        userPrompt: 'hello',
        userId: 'user-1',
        agentRole: 'creator',
      }),
    ).rejects.toMatchObject({ code: 'AI_PROVIDER_UNAVAILABLE' });

    vi.unstubAllEnvs();
  });
});
