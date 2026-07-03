import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fetchLiveSignalsByChannel } from '@/lib/ai-cmo/channel-risk/live-signals';

function mockSupabase(handlers: Record<string, () => Promise<{ data: unknown; error: unknown }>>) {
  return {
    from: (table: string) => ({
      select: () => ({
        limit: async () => handlers[`${table}:probe`]?.() ?? { data: null, error: null },
        eq: () => ({
          gte: () => ({
            in: async () => handlers[`${table}:query`]?.() ?? { data: [], error: null },
          }),
        }),
      }),
    }),
  };
}

vi.mock('@/lib/supabase/server', () => ({
  supabaseAdmin: mockSupabase({}),
}));

describe('fetchLiveSignalsByChannel', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns null when publish tables are unavailable', async () => {
    vi.doMock('@/lib/supabase/server', () => ({
      supabaseAdmin: mockSupabase({
        'campaign_publish_attempts:probe': async () => ({
          data: null,
          error: { code: 'PGRST205', message: 'could not find the table campaign_publish_attempts' },
        }),
        'posts:query': async () => ({
          data: null,
          error: { code: '42501', message: 'permission denied' },
        }),
      }),
    }));

    const { fetchLiveSignalsByChannel: fetch } = await import('@/lib/ai-cmo/channel-risk/live-signals');
    const result = await fetch('ws-1');
    expect(result).toBeNull();
  });

  it('falls back to posts when campaign_publish_attempts is missing', async () => {
    vi.doMock('@/lib/supabase/server', () => ({
      supabaseAdmin: mockSupabase({
        'campaign_publish_attempts:probe': async () => ({
          data: null,
          error: { code: 'PGRST205', message: 'could not find the table' },
        }),
        'posts:query': async () => ({
          data: [
            {
              platforms: ['linkedin'],
              status: 'failed',
              publish_error: 'Meta App Review pending',
              updated_at: new Date().toISOString(),
            },
            {
              platforms: ['linkedin'],
              status: 'published',
              publish_error: null,
              updated_at: new Date().toISOString(),
            },
          ],
          error: null,
        }),
      }),
    }));

    const { fetchLiveSignalsByChannel: fetch } = await import('@/lib/ai-cmo/channel-risk/live-signals');
    const result = await fetch('ws-1');
    expect(result?.get('linkedin')).toEqual({
      rejectionRate24h: 0.5,
      lastRejectionReason: 'Meta App Review pending',
    });
  });
});
