import { supabaseAdmin } from '@/lib/supabase/server';

const REVIEWS_BATCH = Number(process.env.SYNC_REVIEWS_BATCH_SIZE ?? 10);

function isReviewsSyncEnabled(): boolean {
  return (process.env.REPUTATION_SYNC_ENABLED ?? 'true').toLowerCase() !== 'false';
}

async function ingestWorkspaceReviews(workspaceId: string): Promise<number> {
  const { count } = await supabaseAdmin
    .from('external_reviews')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId);

  if ((count ?? 0) > 0) {
    return 0;
  }

  const { error } = await supabaseAdmin.from('external_reviews').insert({
    workspace_id: workspaceId,
    platform: 'Google',
    rating: 4,
    author_name: 'Sample Reviewer',
    review_text: 'Placeholder review from sync-reviews job. Connect Google Places API for live data.',
    status: 'pending',
  });

  if (error) {
    throw new Error(`Failed to insert review for workspace ${workspaceId}: ${error.message}`);
  }

  return 1;
}

export async function syncReviews(): Promise<{ processed: number; ingested: number; errors: number }> {
  if (!isReviewsSyncEnabled()) {
    return { processed: 0, ingested: 0, errors: 0 };
  }

  const { data: workspaces, error } = await supabaseAdmin
    .from('listening_queries')
    .select('workspace_id')
    .eq('is_active', true)
    .limit(REVIEWS_BATCH);

  if (error) {
    throw new Error(`Failed to load workspaces for review sync: ${error.message}`);
  }

  const uniqueWorkspaceIds = [...new Set((workspaces ?? []).map((row) => row.workspace_id as string))];

  let ingested = 0;
  let errors = 0;

  for (const workspaceId of uniqueWorkspaceIds) {
    try {
      ingested += await ingestWorkspaceReviews(workspaceId);
    } catch (err) {
      errors += 1;
      const message = err instanceof Error ? err.message : String(err);
      console.error('[SyncReviews]', message);
    }
  }

  return { processed: uniqueWorkspaceIds.length, ingested, errors };
}

export const syncReviewsJob = { syncReviews };
