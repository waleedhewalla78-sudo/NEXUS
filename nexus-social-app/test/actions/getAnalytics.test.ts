import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

const { mockRpc, mockFrom, mockSingle } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
  mockFrom: vi.fn(),
  mockSingle: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: mockFrom,
    rpc: mockRpc,
  }),
}));

import {
  DEMO_ANALYTICS,
  EMPTY_ANALYTICS,
  getAnalytics,
} from '@/actions/getAnalytics';

describe('getAnalytics', () => {
  const baseArgs = { workspaceId: 'ws-1', userId: 'user-1' };

  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('DEMO_ANALYTICS_ENABLED', 'false');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: mockSingle,
          }),
        }),
      }),
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('returns EMPTY_ANALYTICS when RPC fails in development without demo flag', async () => {
    mockSingle.mockResolvedValue({ data: { id: 'member-1' }, error: null });
    mockRpc.mockResolvedValue({ data: null, error: { message: 'RPC missing' } });

    const result = await getAnalytics(baseArgs);
    expect(result).toEqual(EMPTY_ANALYTICS);
  });

  it('throws in production when RPC fails', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    mockSingle.mockResolvedValue({ data: { id: 'member-1' }, error: null });
    mockRpc.mockResolvedValue({ data: null, error: { message: 'RPC missing' } });

    await expect(getAnalytics(baseArgs)).rejects.toThrow('RPC missing');
  });

  it('returns DEMO_ANALYTICS only when DEMO_ANALYTICS_ENABLED=true in development', async () => {
    vi.stubEnv('DEMO_ANALYTICS_ENABLED', 'true');
    mockSingle.mockResolvedValue({ data: null, error: { message: 'not a member' } });

    const result = await getAnalytics(baseArgs);
    expect(result.totalPosts).toBe(DEMO_ANALYTICS.totalPosts);
  });

  it('throws in production when user is not a workspace member', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    mockSingle.mockResolvedValue({ data: null, error: { message: 'not found' } });

    await expect(getAnalytics(baseArgs)).rejects.toThrow('Unauthorized workspace access');
  });

  it('maps RPC row to AnalyticsResult', async () => {
    mockSingle.mockResolvedValue({ data: { id: 'member-1' }, error: null });
    mockRpc.mockResolvedValue({
      data: [
        {
          total_posts: 5,
          published_posts: 3,
          draft_posts: 2,
          posts_by_platform: [{ platform: 'Twitter', count: 2 }],
          posts_over_time: [{ date: '2026-06-01', count: 1 }],
          total_impressions: 100,
          total_reach: 80,
          total_engagement: 10,
          engagement_by_platform: [],
          engagement_over_time: [],
        },
      ],
      error: null,
    });

    mockFrom
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: mockSingle,
            }),
          }),
        }),
      })
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

    const result = await getAnalytics(baseArgs);
    expect(result.totalPosts).toBe(5);
    expect(result.engagement?.totalImpressions).toBe(100);
  });
});
