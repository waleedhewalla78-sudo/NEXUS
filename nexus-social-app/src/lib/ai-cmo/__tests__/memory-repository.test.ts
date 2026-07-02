import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRepository } from '@/lib/ai-cmo/memory/memory-repository';

const mockFrom = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

vi.mock('@/lib/ai-cmo/memory/qdrant-client', () => ({
  searchQdrantLearnings: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/ai-cmo/agents/radar-data', () => ({
  retrieveExternalSignals: vi.fn().mockResolvedValue([]),
}));

function chain(result: { data: unknown; error: unknown }) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(result),
  };
}

describe('MemoryRepository', () => {
  const repo = new MemoryRepository();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns ranked learnings for an objective', async () => {
    mockFrom.mockReturnValue(
      chain({
        data: [
          {
            id: 'l-1',
            learning_type: 'channel',
            context: { topic: 'linkedin growth' },
            action: {},
            outcome: {},
            roi_impact: 0.5,
            confidence: 0.9,
            validated_by_human: true,
            created_at: new Date().toISOString(),
          },
        ],
        error: null,
      }),
    );

    const learnings = await repo.retrieve({
      workspaceId: '550e8400-e29b-41d4-a716-446655440000',
      objective: 'linkedin growth',
      k: 5,
    });

    expect(learnings).toHaveLength(1);
    expect(learnings[0].learningType).toBe('channel');
  });

  it('returns empty array on query error', async () => {
    mockFrom.mockReturnValue(chain({ data: null, error: { message: 'fail' } }));

    const learnings = await repo.retrieve({
      workspaceId: '550e8400-e29b-41d4-a716-446655440000',
    });

    expect(learnings).toEqual([]);
  });
});
