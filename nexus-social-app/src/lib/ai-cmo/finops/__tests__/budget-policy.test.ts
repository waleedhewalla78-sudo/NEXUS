import { describe, expect, it, vi, beforeEach } from 'vitest';
import { checkBudgetPolicy } from '@/lib/ai-cmo/finops/budget-policy';

const mockFrom = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

function chain(result: { data: unknown; error: unknown }) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockImplementation(() => Promise.resolve(result)),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
  return builder;
}

describe('budget-policy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows when no cap is configured', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'ai_cmo_cost_ledger') return chain({ data: [], error: null });
      return chain({ data: null, error: { code: 'PGRST205' } });
    });

    const result = await checkBudgetPolicy({ workspaceId: '550e8400-e29b-41d4-a716-446655440000' });
    expect(result.allowed).toBe(true);
  });

  it('blocks when projected spend exceeds cap', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'ai_cmo_cost_ledger') {
        return chain({ data: [{ amount_usd: 95 }], error: null });
      }
      return chain({ data: { cap_usd: 100 }, error: null });
    });

    const result = await checkBudgetPolicy({
      workspaceId: '550e8400-e29b-41d4-a716-446655440000',
      estimatedCostUsd: 10,
    });

    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.reason).toContain('budget cap');
    }
  });
});
