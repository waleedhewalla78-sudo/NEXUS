import { describe, it, expect, vi, beforeEach } from 'vitest';
import { upsertVectors, resetQdrantClientForTests } from '@/lib/ai-cmo/memory/qdrant-client';

const upsertMock = vi.fn().mockResolvedValue(undefined);

vi.mock('@qdrant/js-client-rest', () => {
  return {
    QdrantClient: class MockQdrantClient {
      getCollections = vi.fn().mockResolvedValue({ collections: [] });
      createCollection = vi.fn().mockResolvedValue(undefined);
      upsert = upsertMock;
      search = vi.fn().mockResolvedValue([]);
    },
  };
});

vi.mock('@/lib/ai-cmo/memory/embedding-service', () => ({
  generateEmbedding: vi.fn().mockResolvedValue(new Array(1536).fill(0.1)),
}));

describe('qdrant-client upsert payload formatting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetQdrantClientForTests();
    process.env.QDRANT_URL = 'http://localhost:6333';
    process.env.QDRANT_API_KEY = 'test-key';
  });

  it('formats upsert points with id, vector, and payload', async () => {
    const points = [
      {
        id: 'learning-1',
        vector: new Array(1536).fill(0.5),
        payload: { learning_type: 'content_pattern', context: { headline: 'Test' } },
      },
    ];

    await upsertVectors('ws_test_learnings', points);

    expect(upsertMock).toHaveBeenCalledWith(
      'ws_test_learnings',
      expect.objectContaining({
        wait: true,
        points: [
          expect.objectContaining({
            id: 'learning-1',
            vector: expect.any(Array),
            payload: expect.objectContaining({ learning_type: 'content_pattern' }),
          }),
        ],
      }),
    );
  });
});
