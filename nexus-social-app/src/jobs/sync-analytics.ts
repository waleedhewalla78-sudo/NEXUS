import { supabaseAdmin } from '@/lib/supabase/server';
import { decryptToken } from '@/lib/crypto/token-vault';
import { getInsightsFetcher } from '@/lib/analytics/registry';
import type { PostMetrics } from '@/lib/analytics/types';
import {
  normalizePlatformName,
  type PublishPlatform,
  type SocialConnectionRecord,
} from '@/lib/publishers/types';
import { resolvePlatformExternalPostId } from '@/lib/analytics/platform-external-ids';

const SYNC_BATCH_SIZE = Number(process.env.SYNC_ANALYTICS_BATCH_SIZE ?? 100);

function isAnalyticsSyncEnabled(): boolean {
  const flag = process.env.ANALYTICS_SYNC_ENABLED ?? 'true';
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

type PublishedPostRow = {
  id: string;
  workspace_id: string;
  platforms: string[];
  external_post_id: string | null;
};

async function upsertPostAnalytics({
  post,
  platform,
  externalPostId,
  metrics,
  syncError,
}: {
  post: PublishedPostRow;
  platform: PublishPlatform;
  externalPostId: string;
  metrics?: PostMetrics;
  syncError?: string;
}) {
  const now = new Date().toISOString();
  const payload = {
    workspace_id: post.workspace_id,
    post_id: post.id,
    platform,
    external_post_id: externalPostId,
    impressions: metrics?.impressions ?? null,
    reach: metrics?.reach ?? null,
    clicks: metrics?.clicks ?? null,
    likes: metrics?.likes ?? null,
    comments: metrics?.comments ?? null,
    shares: metrics?.shares ?? null,
    saves: metrics?.saves ?? null,
    engagement_rate: metrics?.engagementRate ?? null,
    raw_payload: metrics?.rawPayload ?? null,
    synced_at: syncError ? null : now,
    sync_error: syncError ?? null,
    updated_at: now,
  };

  const { error } = await supabaseAdmin
    .from('post_analytics')
    .upsert(payload, { onConflict: 'post_id,platform,external_post_id' });

  if (error) {
    throw new Error(`Failed to upsert post_analytics: ${error.message}`);
  }
}

async function syncPostPlatform({
  post,
  platform,
}: {
  post: PublishedPostRow;
  platform: PublishPlatform;
}) {
  const externalPostId = await resolvePlatformExternalPostId({
    postId: post.id,
    platform,
    fallbackExternalPostId: post.external_post_id,
  });

  if (!externalPostId) {
    await upsertPostAnalytics({
      post,
      platform,
      externalPostId: 'unknown',
      syncError: `No external post ID for ${platform} on post ${post.id}`,
    });
    return { synced: false, error: true };
  }

  const loaded = await loadConnection({ workspaceId: post.workspace_id, platform });
  if (!loaded) {
    await upsertPostAnalytics({
      post,
      platform,
      externalPostId,
      syncError: `No connected ${platform} account for workspace ${post.workspace_id}`,
    });
    return { synced: false, error: true };
  }

  try {
    const fetcher = getInsightsFetcher(platform);
    const metrics = await fetcher.fetchInsights({
      externalPostId,
      accessToken: loaded.accessToken,
      accountId: loaded.connection.account_id,
    });
    await upsertPostAnalytics({ post, platform, externalPostId, metrics });
    return { synced: true, error: false };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown insights error';
    console.error(`[SyncAnalytics] post=${post.id} platform=${platform}:`, message);
    await upsertPostAnalytics({
      post,
      platform,
      externalPostId,
      syncError: message.slice(0, 2000),
    });
    return { synced: false, error: true };
  }
}

export async function syncAnalytics(): Promise<{
  processed: number;
  synced: number;
  errors: number;
}> {
  if (!isAnalyticsSyncEnabled()) {
    return { processed: 0, synced: 0, errors: 0 };
  }

  const { data: posts, error } = await supabaseAdmin
    .from('posts')
    .select('id, workspace_id, platforms, external_post_id')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(SYNC_BATCH_SIZE);

  if (error) {
    throw new Error(`Failed to query published posts: ${error.message}`);
  }

  const publishedPosts = (posts ?? []).filter((row) => {
    const post = row as PublishedPostRow;
    return post.external_post_id !== null || (post.platforms?.length ?? 0) > 0;
  });

  let synced = 0;
  let errors = 0;

  for (const row of publishedPosts) {
    const post = row as PublishedPostRow;
    const platforms = (post.platforms ?? [])
      .map(normalizePlatformName)
      .filter((platform): platform is PublishPlatform => platform !== null);

    if (platforms.length === 0) {
      continue;
    }

    for (const platform of platforms) {
      const result = await syncPostPlatform({ post, platform });
      if (result.synced) synced += 1;
      if (result.error) errors += 1;
    }
  }

  return {
    processed: publishedPosts.length,
    synced,
    errors,
  };
}

export const syncAnalyticsJob = {
  syncAnalytics,
};
