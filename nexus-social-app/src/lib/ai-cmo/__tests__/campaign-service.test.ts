import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  createCampaignViaReconciler,
  persistContentPieceViaReconciler,
  linkCampaignToPublishPostViaReconciler,
} from '@/lib/ai-cmo/campaign-service';

vi.mock('@/lib/ai-cmo/utils/secure-reconciler-writer', () => ({
  secureSyncToSoR: vi.fn(),
  securePatchSoR: vi.fn(),
}));

vi.mock('@/lib/ai-cmo/services/campaign-post-linker', () => ({
  linkCampaignPostViaReconciler: vi.fn(),
}));

vi.mock('@/lib/ai-cmo/types/reconciler', () => ({
  SorTableNames: {
    AI_CMO_CAMPAIGNS: 'ai_cmo_campaigns',
    AI_CMO_CONTENT_PIECES: 'ai_cmo_content_pieces',
    POSTS: 'posts',
  },
}));

import { secureSyncToSoR, securePatchSoR } from '@/lib/ai-cmo/utils/secure-reconciler-writer';
import { linkCampaignPostViaReconciler } from '@/lib/ai-cmo/services/campaign-post-linker';

const workspaceId = '550e8400-e29b-41d4-a716-446655440000';
const userId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

describe('campaign service (reconciler writes)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates campaign via reconciler', async () => {
    vi.mocked(secureSyncToSoR).mockResolvedValue({ ok: true, id: 'camp-1' });

    const result = await createCampaignViaReconciler({
      workspaceId,
      userId,
      name: 'Q3 Launch',
      objective: 'Drive demos',
    });

    expect(result.ok).toBe(true);
    expect(secureSyncToSoR).toHaveBeenCalledWith(
      expect.objectContaining({
        auditAction: 'ai_cmo.campaign.created',
        table: 'ai_cmo_campaigns',
      }),
    );
  });

  it('persists content piece via reconciler', async () => {
    vi.mocked(secureSyncToSoR).mockResolvedValue({ ok: true, id: 'piece-1' });

    await persistContentPieceViaReconciler({
      workspaceId,
      userId,
      campaignId: 'camp-1',
      confidence: 0.85,
      plan: {
        objective: 'Demo',
        audience: 'B2B',
        channels: ['linkedin'],
        keyMessages: ['Try now'],
        contentThemes: ['product'],
        kpis: ['leads'],
        horizon: 'tactical',
        rawSummary: 'summary',
      },
      content: {
        caption: 'Hello world',
        hashtags: [],
        callToAction: 'Sign up',
        platforms: ['linkedin'],
        locale: 'en-US',
        draftMetadata: {},
      },
    });

    expect(secureSyncToSoR).toHaveBeenCalledWith(
      expect.objectContaining({
        auditAction: 'ai_cmo.content_piece.created',
        table: 'ai_cmo_content_pieces',
      }),
    );
  });

  it('links campaign to scheduled post via reconciler', async () => {
    vi.mocked(linkCampaignPostViaReconciler).mockResolvedValue({
      ok: true,
      postId: 'post-1',
      campaignId: 'camp-1',
    });

    const result = await linkCampaignToPublishPostViaReconciler({
      workspaceId,
      userId,
      campaignId: 'camp-1',
      contentId: 'piece-1',
      content: {
        caption: 'Launch now',
        hashtags: ['#launch'],
        callToAction: 'Sign up',
        platforms: ['linkedin'],
        locale: 'en-US',
        draftMetadata: {},
      },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.postId).toBe('post-1');
    }
    expect(linkCampaignPostViaReconciler).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId,
        userId,
        campaignId: 'camp-1',
        contentId: 'piece-1',
      }),
    );
  });
});
