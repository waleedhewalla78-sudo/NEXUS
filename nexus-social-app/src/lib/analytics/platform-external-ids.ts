import { supabaseAdmin } from '@/lib/supabase/server';
import type { PublishPlatform } from '@/lib/publishers/types';

/** Persists per-platform external post IDs at publish time for multi-network analytics sync. */
export async function recordPlatformExternalPostId({
  workspaceId,
  postId,
  platform,
  externalPostId,
}: {
  workspaceId: string;
  postId: string;
  platform: PublishPlatform;
  externalPostId: string;
}) {
  const now = new Date().toISOString();
  const { error } = await supabaseAdmin.from('post_analytics').upsert(
    {
      workspace_id: workspaceId,
      post_id: postId,
      platform,
      external_post_id: externalPostId,
      updated_at: now,
    },
    { onConflict: 'post_id,platform,external_post_id' },
  );

  if (error) {
    throw new Error(`Failed to record platform external post id: ${error.message}`);
  }
}

export async function resolvePlatformExternalPostId({
  postId,
  platform,
  fallbackExternalPostId,
}: {
  postId: string;
  platform: PublishPlatform;
  fallbackExternalPostId: string | null;
}): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('post_analytics')
    .select('external_post_id')
    .eq('post_id', postId)
    .eq('platform', platform)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to resolve platform external post id: ${error.message}`);
  }

  return data?.external_post_id ?? fallbackExternalPostId;
}

export const platformExternalIdsUtils = {
  recordPlatformExternalPostId,
  resolvePlatformExternalPostId,
};
