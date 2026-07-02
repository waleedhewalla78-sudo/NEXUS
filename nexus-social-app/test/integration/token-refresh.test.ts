import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFrom = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

vi.mock('@/lib/crypto/token-vault', () => ({
  encryptToken: vi.fn().mockReturnValue({ ciphertext: 'enc', iv: 'iv', tag: 'tag' }),
  decryptToken: vi.fn().mockReturnValue('refreshed-token'),
}));

vi.mock('@/lib/oauth/token-refresh', () => ({
  refreshOAuthToken: vi.fn(),
}));

import { refreshExpiringTokens } from '@/jobs/refresh-tokens';

describe('Integration: refreshExpiringTokens', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.TOKEN_REFRESH_ENABLED = 'true';
  });

  it('skips when token refresh is disabled', async () => {
    process.env.TOKEN_REFRESH_ENABLED = 'false';
    const result = await refreshExpiringTokens();
    expect(result).toEqual({ processed: 0, refreshed: 0, skipped: 0, errors: 0 });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('returns zero counts when no expiring connections', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    });

    const result = await refreshExpiringTokens();
    expect(result).toEqual({ processed: 0, refreshed: 0, skipped: 0, errors: 0 });
  });
});
