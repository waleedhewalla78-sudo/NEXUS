import { describe, expect, it, vi } from 'vitest';
import { traceAgentCall } from '@/lib/observability/trace-wrapper';

vi.mock('@/lib/observability/langfuse-client', () => ({
  createAiCmoTrace: vi.fn(() => ({
    id: 'trace-123',
    isStub: true,
    event: vi.fn(),
    end: vi.fn().mockResolvedValue(undefined),
  })),
}));

describe('traceAgentCall', () => {
  it('returns latency and traceId for agent execution', async () => {
    const result = await traceAgentCall({
      agentName: 'brain.plan',
      workspaceId: '550e8400-e29b-41d4-a716-446655440000',
      userId: 'user-1',
      fn: async () => ({ plan: 'ok' }),
    });

    expect(result.result).toEqual({ plan: 'ok' });
    expect(result.traceId).toBe('trace-123');
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });
});
