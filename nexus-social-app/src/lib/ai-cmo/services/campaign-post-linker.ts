/**
 * Feature 004 — Campaign → post_id link via secure reconciler (S14-T002).
 * Closes SoR/SoI gap: ai_cmo_campaigns.post_id → posts.id for 003 publish worker.
 *
 * [SPEC]
 * - Creates scheduled post in 003 `posts` table (secureSyncToSoR — no ai_cmo rate limit)
 * - Patches ai_cmo_campaigns.post_id via securePatchSoR
 * - Patches ai_cmo_content_pieces.post_id via securePatchSoR
 * - Never touches src/lib/sync/reconciler.ts directly
 */

import type { CreatedContent } from '@/lib/ai-cmo/creator-agent';
import { SorTableNames } from '@/lib/ai-cmo/types/reconciler';
import { resolvePostMediaUrls } from '@/lib/publishing/resolve-media-urls';
import { securePatchSoR, secureSyncToSoR } from '@/lib/ai-cmo/utils/secure-reconciler-writer';

export type LinkCampaignPostInput = {
  workspaceId: string;
  userId: string;
  campaignId: string;
  contentId: string;
  content: CreatedContent;
  scheduledAt?: string;
  brandId?: string | null;
};

export type LinkPostResult =
  | { ok: true; postId: string; campaignId: string }
  | { ok: false; error: string };

export async function linkCampaignPostViaReconciler(
  input: LinkCampaignPostInput,
): Promise<LinkPostResult> {
  const scheduledAt =
    input.scheduledAt ?? new Date(Date.now() + 2 * 60 * 1000).toISOString();

  const mediaUrls = resolvePostMediaUrls(input.content);

  const postData: Record<string, unknown> = {
    workspace_id: input.workspaceId,
    content: {
      text: input.content.caption,
      media_urls: mediaUrls,
      hashtags: input.content.hashtags,
      call_to_action: input.content.callToAction,
    },
    platforms: input.content.platforms,
    status: 'scheduled',
    scheduled_at: scheduledAt,
  };
  if (input.brandId) {
    postData.brand_id = input.brandId;
  }

  const postResult = await secureSyncToSoR({
    table: SorTableNames.POSTS,
    workspaceId: input.workspaceId,
    userId: input.userId,
    auditAction: 'ai_cmo.campaign.post_scheduled',
    auditMetadata: { campaignId: input.campaignId, contentId: input.contentId },
    data: postData,
  });

  if (!postResult.ok) {
    return { ok: false, error: postResult.error };
  }

  const campaignPatch = await securePatchSoR(
    {
      table: SorTableNames.AI_CMO_CAMPAIGNS,
      id: input.campaignId,
      workspaceId: input.workspaceId,
      userId: input.userId,
      auditAction: 'ai_cmo.campaign.post_linked',
      auditMetadata: { postId: postResult.id },
      patch: { post_id: postResult.id, status: 'active' },
    },
    { workspaceId: input.workspaceId },
  );

  if (!campaignPatch.ok) {
    return { ok: false, error: campaignPatch.error };
  }

  const contentPatch = await securePatchSoR(
    {
      table: SorTableNames.AI_CMO_CONTENT_PIECES,
      id: input.contentId,
      workspaceId: input.workspaceId,
      userId: input.userId,
      auditAction: 'ai_cmo.content_piece.post_linked',
      auditMetadata: { postId: postResult.id },
      patch: { post_id: postResult.id },
    },
    { workspaceId: input.workspaceId },
  );

  if (!contentPatch.ok) {
    return { ok: false, error: contentPatch.error };
  }

  return { ok: true, postId: postResult.id, campaignId: input.campaignId };
}

/** @deprecated Use linkCampaignPostViaReconciler — kept for backward-compatible imports. */
export async function linkCampaignToPublishPostViaReconciler(
  input: LinkCampaignPostInput,
): Promise<LinkPostResult> {
  return linkCampaignPostViaReconciler(input);
}

export const campaignPostLinkerUtils = {
  linkCampaignPostViaReconciler,
};
