import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

const { mockFrom, mockSingle } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockSingle: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  supabaseAdmin: {
    from: mockFrom,
  },
}));

import { fetchListeningQueries } from '@/actions/reputation';

describe('reputation production hardening', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');

    mockFrom.mockImplementation((table: string) => {
      if (table === 'workspace_members') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: mockSingle,
              }),
            }),
          }),
        };
      }
      if (table === 'listening_queries') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST205', message: 'Could not find the table listening_queries in the schema cache' },
              }),
            }),
          }),
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('throws in production when reputation tables are missing', async () => {
    mockSingle.mockResolvedValue({ data: { id: 'member-1' }, error: null });

    await expect(
      fetchListeningQueries('ws-1', 'user-1'),
    ).rejects.toThrow(/reputation tables missing in production schema/);
  });
});
