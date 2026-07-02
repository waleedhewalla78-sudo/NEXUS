import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/tools/get-workspace-analytics/route';

const mockRpc = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  supabaseAdmin: {
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

function createRequest(body: unknown, auth = true) {
  return new Request('http://localhost:3005/api/tools/get-workspace-analytics', {
    method: 'POST',
    headers: new Headers({
      'Content-Type': 'application/json',
      ...(auth ? { authorization: 'Bearer test-secret-123' } : {}),
    }),
    body: JSON.stringify(body),
  });
}

describe('Integration: POST /api/tools/get-workspace-analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unauthorized tool requests', async () => {
    const res = await POST(createRequest({ workspace_id: '123e4567-e89b-12d3-a456-426614174000' }, false));
    expect(res.status).toBe(401);
  });

  it('returns ingested analytics from post_analytics RPC', async () => {
    mockRpc.mockResolvedValue({
      data: [
        {
          total_posts: 12,
          published_posts: 8,
          draft_posts: 4,
          total_impressions: 1500,
          total_reach: 900,
          total_engagement: 120,
          engagement_by_platform: [{ platform: 'linkedin', engagement: 80 }],
        },
      ],
      error: null,
    });

    const res = await POST(
      createRequest({ workspace_id: '123e4567-e89b-12d3-a456-426614174000' }),
    );
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json._source).toBe('post_analytics');
    expect(json.engagement.total_impressions).toBe(1500);
    expect(mockRpc).toHaveBeenCalledWith('get_workspace_analytics', {
      p_workspace_id: '123e4567-e89b-12d3-a456-426614174000',
    });
  });

  it('surfaces RPC errors as 500', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'relation post_analytics does not exist' },
    });

    const res = await POST(
      createRequest({ workspace_id: '123e4567-e89b-12d3-a456-426614174000' }),
    );
    expect(res.status).toBe(500);
  });
});
