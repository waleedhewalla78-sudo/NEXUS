import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  estimateTokenCost,
  estimateTokensFromText,
  recordAgentCost,
} from '@/lib/ai-cmo/finops/cost-ledger';

vi.mock('@/lib/ai-cmo/utils/secure-reconciler-writer', () => ({
  secureSyncToSoR: vi.fn().mockResolvedValue({ ok: true, id: 'cost-1' }),
}));

import { secureSyncToSoR } from '@/lib/ai-cmo/utils/secure-reconciler-writer';

describe('cost-ledger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('estimates tokens from text length', () => {
    expect(estimateTokensFromText('hello world')).toBeGreaterThan(0);
  });

  it('estimates cost from token count', () => {
    expect(estimateTokenCost(1000, 'openai/gpt-4o-mini')).toBeCloseTo(0.002, 4);
  });

  it('records agent cost via reconciler', async () => {
    const result = await recordAgentCost({
      workspaceId: '550e8400-e29b-41d4-a716-446655440000',
      userId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      agentName: 'strategic_brain',
      tokenCount: 500,
      modelUsed: 'openai/gpt-4o-mini',
    });

    expect(result).toEqual({ ok: true, id: 'cost-1' });
    expect(secureSyncToSoR).toHaveBeenCalledWith(
      expect.objectContaining({
        auditAction: 'ai_cmo.cost.recorded',
        data: expect.objectContaining({ agent_name: 'strategic_brain' }),
      }),
    );
  });

  it('skips zero-cost records', async () => {
    const result = await recordAgentCost({
      workspaceId: '550e8400-e29b-41d4-a716-446655440000',
      userId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      agentName: 'strategic_brain',
    });

    expect(result).toEqual({ ok: true, skipped: true });
    expect(secureSyncToSoR).not.toHaveBeenCalled();
  });
});
