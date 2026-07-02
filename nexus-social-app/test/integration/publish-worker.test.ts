import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFrom = vi.fn();
const mockPublisherPublish = vi.fn();
const mockRecordExternalId = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

vi.mock('@/lib/publishers/registry', () => ({
  getPublisher: () => ({
    validate: vi.fn().mockResolvedValue({ ok: true }),
    publish: (...args: unknown[]) => mockPublisherPublish(...args),
    checkTokenHealth: vi.fn().mockResolvedValue({ ok: true }),
  }),
}));

vi.mock('@/lib/workspace/meta-app-review', () => ({
  metaAppReviewUtils: {
    isMetaPlatform: (platform: string) => platform === 'facebook' || platform === 'instagram',
    canPublishToMeta: () => true,
  },
}));

vi.mock('@/lib/analytics/platform-external-ids', () => ({
  recordPlatformExternalPostId: (...args: unknown[]) => mockRecordExternalId(...args),
}));

vi.mock('@/lib/crypto/token-vault', () => ({
  decryptToken: () => 'mock-access-token',
}));

import { publishDuePosts } from '@/jobs/publish-due-posts';

function chainMock(responses: Record<string, unknown>[]) {
  let index = 0;
  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockImplementation(() => Promise.resolve(responses[index++] ?? { data: null, error: null })),
    update: vi.fn().mockReturnThis(),
    then: undefined as unknown,
  };
  builder.then = undefined;
  return builder;
}

describe('Integration: publishDuePosts worker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PUBLISHING_ENABLED = 'true';
    mockPublisherPublish.mockResolvedValue({
      externalPostId: 'ext-123',
      permalink: 'https://linkedin.com/feed/update/ext-123',
      connectionId: 'conn-1',
    });
    mockRecordExternalId.mockResolvedValue(undefined);
  });

  it('publishes due scheduled posts and records external IDs', async () => {
    const workspaceId = '123e4567-e89b-12d3-a456-426614174000';
    const postId = '223e4567-e89b-12d3-a456-426614174001';

    const postsTable = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [
          {
            id: postId,
            workspace_id: workspaceId,
            platforms: ['linkedin'],
            content: 'Integration test post',
            scheduled_at: new Date(Date.now() - 60_000).toISOString(),
            status: 'scheduled',
          },
        ],
        error: null,
      }),
      update: vi.fn().mockReturnThis(),
    };
    postsTable.eq.mockImplementation(function (this: typeof postsTable) {
      if (postsTable.update.mock.calls.length > 0) {
        return Promise.resolve({ data: null, error: null });
      }
      return postsTable;
    });

    const connectionQuery = chainMock([
      {
        data: {
          id: 'conn-1',
          workspace_id: workspaceId,
          platform: 'linkedin',
          account_id: 'acct-1',
          account_name: 'Test Page',
          account_handle: '@test',
          access_token_enc: 'enc',
          token_iv: 'iv',
          token_tag: 'tag',
          metadata: {},
        },
        error: null,
      },
    ]);

    mockFrom.mockImplementation((table: string) => {
      if (table === 'posts') {
        return postsTable;
      }
      if (table === 'workspace_social_connections') {
        return connectionQuery;
      }
      if (table === 'workspaces') {
        return chainMock([{ data: { meta_app_review_status: 'approved' }, error: null }]);
      }
      return postsTable;
    });

    const result = await publishDuePosts();

    expect(result.processed).toBe(1);
    expect(result.published).toBe(1);
    expect(result.failed).toBe(0);
    expect(mockPublisherPublish).toHaveBeenCalled();
    expect(mockRecordExternalId).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId,
        postId,
        platform: 'linkedin',
        externalPostId: 'ext-123',
      }),
    );
  });

  it('returns zero counts when publishing is disabled', async () => {
    process.env.PUBLISHING_ENABLED = 'false';
    const result = await publishDuePosts();
    expect(result).toEqual({ processed: 0, published: 0, failed: 0 });
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
