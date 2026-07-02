import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * T053 acceptance — schedule → worker publish → external_post_id (mocked externals).
 * Live OAuth UAT uses `npm run uat:t053:sandbox` or `npm run uat:t053` with real credentials.
 */
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
  decryptToken: () => 'sandbox-access-token-for-uat',
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

describe('Integration: T053 sandbox publish UAT', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PUBLISHING_ENABLED = 'true';
    mockPublisherPublish.mockResolvedValue({
      externalPostId: 'sandbox-graph-12345',
      permalink: 'https://facebook.com/sandbox-graph-12345',
      connectionId: 'conn-sandbox-1',
    });
    mockRecordExternalId.mockResolvedValue(undefined);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('T053: publishes due facebook post and records external_post_id', async () => {
    const workspaceId = '11111111-1111-1111-1111-111111111111';
    const postId = '33333333-3333-3333-3333-333333333333';

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
            platforms: ['facebook'],
            content: { text: 'T053-SANDBOX acceptance post' },
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
          id: 'conn-sandbox-1',
          workspace_id: workspaceId,
          platform: 'facebook',
          account_id: 'sandbox-page-001',
          account_name: 'T053 Sandbox Page',
          account_handle: null,
          access_token_enc: 'enc',
          token_iv: 'iv',
          token_tag: 'tag',
          metadata: { seeded_by: 't053-sandbox-uat.test.ts' },
        },
        error: null,
      },
    ]);

    mockFrom.mockImplementation((table: string) => {
      if (table === 'posts') return postsTable;
      if (table === 'workspace_social_connections') return connectionQuery;
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
        platform: 'facebook',
        externalPostId: 'sandbox-graph-12345',
      }),
    );
  });
});
