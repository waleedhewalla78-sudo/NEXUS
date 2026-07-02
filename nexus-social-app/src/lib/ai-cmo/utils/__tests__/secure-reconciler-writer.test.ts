import { describe, expect, it, vi, beforeEach } from 'vitest';
import { isAiCmoSorTable, buildAiCmoRateLimitKey } from '@/lib/ai-cmo/types/reconciler';

vi.mock('@/lib/cache', () => ({
  default: {
    incr: vi.fn(),
    expire: vi.fn(),
  },
}));

vi.mock('@/lib/sync/reconciler', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/sync/reconciler')>();
  return {
    ...actual,
    syncToSoR: vi.fn().mockResolvedValue({ ok: true, id: 'rec-1' }),
    patchSoR: vi.fn().mockResolvedValue({ ok: true, id: 'rec-1' }),
  };
});

vi.mock('@/lib/supabase/server', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { version: 2, updated_at: '2026-01-01T00:00:00Z' }, error: null }),
    })),
  },
}));

import redis from '@/lib/cache';
import { syncToSoR } from '@/lib/sync/reconciler';
import {
  checkAndIncrementAiCmoWriteRate,
  secureSyncToSoR,
  securePatchSoR,
} from '@/lib/ai-cmo/utils/secure-reconciler-writer';
import { patchSoR } from '@/lib/sync/reconciler';

const workspaceId = '550e8400-e29b-41d4-a716-446655440000';

describe('secure reconciler writer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(redis!.incr).mockResolvedValue(1);
    vi.mocked(redis!.expire).mockResolvedValue(1);
  });

  it('identifies ai_cmo tables', () => {
    expect(isAiCmoSorTable('ai_cmo_campaigns')).toBe(true);
    expect(isAiCmoSorTable('posts')).toBe(false);
  });

  it('builds rate limit redis key', () => {
    expect(buildAiCmoRateLimitKey(workspaceId)).toBe(`workspace:${workspaceId}:ai_cmo_rate`);
  });

  it('blocks ai_cmo writes when rate limit exceeded', async () => {
    vi.mocked(redis!.incr).mockResolvedValue(101);

    const result = await secureSyncToSoR({
      table: 'ai_cmo_campaigns',
      workspaceId,
      userId: 'user-1',
      auditAction: 'test',
      data: { workspace_id: workspaceId, name: 'Test' },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('rate limit');
    }
    expect(syncToSoR).not.toHaveBeenCalled();
  });

  it('delegates to 003 reconciler when under limit', async () => {
    const result = await secureSyncToSoR({
      table: 'ai_cmo_campaigns',
      workspaceId,
      userId: 'user-1',
      auditAction: 'test',
      data: { workspace_id: workspaceId, name: 'Test' },
    });

    expect(result.ok).toBe(true);
    expect(syncToSoR).toHaveBeenCalledOnce();
  });

  it('returns optimistic lock error when expectedVersion mismatches', async () => {
    const result = await securePatchSoR(
      {
        table: 'ai_cmo_campaigns',
        id: 'camp-1',
        workspaceId,
        userId: 'user-1',
        auditAction: 'test.patch',
        patch: { status: 'completed' },
      },
      { workspaceId, expectedVersion: 1 },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('Optimistic lock conflict');
    }
    expect(patchSoR).not.toHaveBeenCalled();
  });

  it('increments version and delegates patch when OCC matches', async () => {
    const result = await securePatchSoR(
      {
        table: 'ai_cmo_campaigns',
        id: 'camp-1',
        workspaceId,
        userId: 'user-1',
        auditAction: 'test.patch',
        patch: { status: 'completed' },
      },
      { workspaceId, expectedVersion: 2 },
    );

    expect(result.ok).toBe(true);
    expect(patchSoR).toHaveBeenCalledWith(
      expect.objectContaining({
        patch: expect.objectContaining({ version: 3, status: 'completed' }),
      }),
    );
  });

  it('scrubs PII from ai_cmo_learnings before delegating to reconciler', async () => {
    await secureSyncToSoR({
      table: 'ai_cmo_learnings',
      workspaceId,
      userId: 'user-1',
      auditAction: 'test.learning',
      data: {
        workspace_id: workspaceId,
        learning_type: 'channel',
        context: { note: 'Contact lead@client.com' },
        action: {},
        outcome: {},
      },
    });

    expect(syncToSoR).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          context: expect.objectContaining({
            note: expect.stringContaining('[PII_REDACTED]'),
          }),
        }),
      }),
    );
    const call = vi.mocked(syncToSoR).mock.calls[0][0];
    expect(JSON.stringify(call.data)).not.toContain('lead@client.com');
  });

  it('passes posts table without rate limit check', async () => {
    vi.mocked(redis!.incr).mockResolvedValue(999);

    await secureSyncToSoR({
      table: 'posts',
      workspaceId,
      userId: 'user-1',
      auditAction: 'test',
      data: {
        workspace_id: workspaceId,
        content: { text: 'hi' },
        platforms: ['linkedin'],
      },
    });

    expect(redis!.incr).not.toHaveBeenCalled();
    expect(syncToSoR).toHaveBeenCalledOnce();
  });
});
