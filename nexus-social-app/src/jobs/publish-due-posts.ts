import { supabaseAdmin } from '@/lib/supabase/server';
import { decryptToken } from '@/lib/crypto/token-vault';
import {
  isImplementedPublishPlatform,
  normalizePlatformName,
  type PublishPlatform,
  type PublishablePost,
  type SocialConnectionRecord,
} from '@/lib/publishers/types';
import { NotImplementedPublishPlatformError } from '@/lib/publishers/errors';
import { getPublisher } from '@/lib/publishers/registry';
import { metaAppReviewUtils } from '@/lib/workspace/meta-app-review';
import { recordPlatformExternalPostId } from '@/lib/analytics/platform-external-ids';

const PUBLISH_BATCH_SIZE = 50;

function isPublishingEnabled(): boolean {
  const flag = process.env.PUBLISHING_ENABLED ?? 'true';
  return flag.toLowerCase() !== 'false';
}

function resolveEnvFallbackToken(platform: PublishPlatform): {
  accountId: string;
  accessToken: string;
} | null {
  if (platform !== 'facebook') return null;
  const accessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN ?? '';
  const accountId = process.env.FACEBOOK_PAGE_ID ?? '';
  if (!accessToken || !accountId) return null;
  return { accountId, accessToken };
}

async function loadConnection({
  workspaceId,
  platform,
}: {
  workspaceId: string;
  platform: PublishPlatform;
}): Promise<{ connection: SocialConnectionRecord; accessToken: string } | null> {
  const { data, error } = await supabaseAdmin
    .from('workspace_social_connections')
    .select(
      'id, workspace_id, platform, account_id, account_name, account_handle, access_token_enc, token_iv, token_tag, metadata',
    )
    .eq('workspace_id', workspaceId)
    .eq('platform', platform)
    .is('disconnected_at', null)
    .order('connected_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load social connection: ${error.message}`);
  }

  if (data) {
    const accessToken = decryptToken({
      ciphertext: data.access_token_enc,
      iv: data.token_iv,
      tag: data.token_tag,
    });
    return { connection: data as SocialConnectionRecord, accessToken };
  }

  const fallback = resolveEnvFallbackToken(platform);
  if (!fallback) return null;

  return {
    connection: {
      id: 'env-fallback',
      workspace_id: workspaceId,
      platform,
      account_id: fallback.accountId,
      account_name: null,
      account_handle: null,
      access_token_enc: '',
      token_iv: '',
      token_tag: '',
      metadata: { source: 'env_fallback' },
    },
    accessToken: fallback.accessToken,
  };
}

async function markPostFailed(postId: string, publishError: string) {
  await supabaseAdmin
    .from('posts')
    .update({
      status: 'failed',
      publish_error: publishError.slice(0, 2000),
      updated_at: new Date().toISOString(),
    })
    .eq('id', postId);
}

async function markPostPublished({
  postId,
  externalPostId,
  externalPermalink,
  connectionId,
}: {
  postId: string;
  externalPostId: string;
  externalPermalink?: string;
  connectionId?: string;
}) {
  await supabaseAdmin
    .from('posts')
    .update({
      status: 'published',
      publish_error: null,
      external_post_id: externalPostId,
      external_permalink: externalPermalink ?? null,
      published_at: new Date().toISOString(),
      connection_id: connectionId && connectionId !== 'env-fallback' ? connectionId : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', postId);
}

async function loadMetaAppReviewStatus(workspaceId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('workspaces')
    .select('meta_app_review_status')
    .eq('id', workspaceId)
    .maybeSingle();

  if (error) {
    console.warn(`[PublishJob] meta_app_review_status lookup failed: ${error.message}`);
    return 'pending';
  }

  return (data?.meta_app_review_status as string | null) ?? 'pending';
}

async function publishPostToPlatform({
  post,
  platform,
}: {
  post: PublishablePost;
  platform: PublishPlatform;
}) {
  if (metaAppReviewUtils.isMetaPlatform(platform)) {
    const reviewStatus = await loadMetaAppReviewStatus(post.workspace_id);
    if (!metaAppReviewUtils.canPublishToMeta(reviewStatus as 'pending' | 'approved' | 'rejected')) {
      throw new Error(
        'Meta App Review pending — Facebook/Instagram publishing is blocked until approved in workspace settings.',
      );
    }
  }

  const loaded = await loadConnection({ workspaceId: post.workspace_id, platform });
  if (!loaded) {
    throw new Error(`No connected ${platform} account for workspace ${post.workspace_id}`);
  }

  const publisher = getPublisher(platform);
  const result = await publisher.publish({
    post,
    connection: loaded.connection,
    accessToken: loaded.accessToken,
  });

  return result;
}

export async function publishDuePosts(): Promise<{ processed: number; published: number; failed: number }> {
  if (!isPublishingEnabled()) {
    return { processed: 0, published: 0, failed: 0 };
  }

  const now = new Date().toISOString();
  const { data: duePosts, error } = await supabaseAdmin
    .from('posts')
    .select('id, workspace_id, platforms, content, scheduled_at, status')
    .eq('status', 'scheduled')
    .lte('scheduled_at', now)
    .order('scheduled_at', { ascending: true })
    .limit(PUBLISH_BATCH_SIZE);

  if (error) {
    throw new Error(`Failed to query scheduled posts: ${error.message}`);
  }

  let published = 0;
  let failed = 0;

  for (const row of duePosts ?? []) {
    const post = row as PublishablePost;
    const platforms = (post.platforms ?? [])
      .map(normalizePlatformName)
      .filter((platform): platform is PublishPlatform => platform !== null);

    const implemented = platforms.filter(isImplementedPublishPlatform);
    const skipped = platforms.filter((p) => !isImplementedPublishPlatform(p));

    if (skipped.length) {
      console.warn(
        `[PublishJob] Skipping unimplemented platform(s) for post ${post.id}: ${skipped.join(', ')}`,
      );
    }

    if (implemented.length === 0) {
      const detail =
        platforms.length === 0
          ? 'No supported platforms configured on post'
          : `No implemented publish adapters for: ${platforms.join(', ')}`;
      await markPostFailed(post.id, detail);
      failed += 1;
      continue;
    }

    try {
      let lastResult: Awaited<ReturnType<typeof publishPostToPlatform>> | null = null;
      for (const platform of implemented) {
        lastResult = await publishPostToPlatform({ post, platform });
        await recordPlatformExternalPostId({
          workspaceId: post.workspace_id,
          postId: post.id,
          platform,
          externalPostId: lastResult.externalPostId,
        });
      }

      if (lastResult) {
        await markPostPublished({
          postId: post.id,
          externalPostId: lastResult.externalPostId,
          externalPermalink: lastResult.permalink,
          connectionId: lastResult.connectionId,
        });
        published += 1;
      }
    } catch (err) {
      if (err instanceof NotImplementedPublishPlatformError) {
        console.warn(`[PublishJob] ${err.message}`);
        continue;
      }
      const message = err instanceof Error ? err.message : 'Unknown publish error';
      console.error(`[PublishJob] Failed post ${post.id}:`, message);
      await markPostFailed(post.id, message);
      failed += 1;
    }
  }

  return {
    processed: duePosts?.length ?? 0,
    published,
    failed,
  };
}

export const publishDuePostsJob = {
  publishDuePosts,
};
