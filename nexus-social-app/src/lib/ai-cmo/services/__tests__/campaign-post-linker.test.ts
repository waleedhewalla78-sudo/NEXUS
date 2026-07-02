import { describe, expect, it, vi, beforeEach } from 'vitest';
import { linkCampaignPostViaReconciler } from '@/lib/ai-cmo/services/campaign-post-linker';

vi.mock('@/lib/ai-cmo/utils/secure-reconciler-writer', () => ({
  secureSyncToSoR: vi.fn(),
  securePatchSoR: vi.fn(),
}));

import { secureSyncToSoR, securePatchSoR } from '@/lib/ai-cmo/utils/secure-reconciler-writer';

const workspaceId = '550e8400-e29b-41d4-a716-446655440000';
const userId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
const campaignId = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
const contentId = '8d9e6679-7425-40de-944b-e07fc1f90ae8';

describe('campaign-post-linker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates post and patches ai_cmo_campaigns.post_id via secure wrapper', async () => {
    vi.mocked(secureSyncToSoR).mockResolvedValue({ ok: true, id: 'post-99' });
    vi.mocked(securePatchSoR).mockResolvedValue({ ok: true, id: campaignId });

    const result = await linkCampaignPostViaReconciler({
      workspaceId,
      userId,
      campaignId,
      contentId,
      content: {
        caption: 'Hello world',
        hashtags: ['#test'],
        callToAction: 'Learn more',
        platforms: ['linkedin'],
        locale: 'en-US',
        draftMetadata: {},
      },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.postId).toBe('post-99');
    }

    expect(securePatchSoR).toHaveBeenCalledWith(
      expect.objectContaining({
        table: 'ai_cmo_campaigns',
        patch: expect.objectContaining({ post_id: 'post-99' }),
      }),
      expect.objectContaining({ workspaceId }),
    );
  });
});
