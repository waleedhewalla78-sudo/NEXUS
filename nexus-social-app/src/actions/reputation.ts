'use server';

import { supabaseAdmin } from '@/lib/supabase/server';

export type ListeningQuery = {
  id: string;
  workspace_id: string;
  query_text: string;
  query_type: string;
  platforms: string[];
  is_active: boolean;
  created_at: string;
};

async function verifyWorkspaceMembership(workspaceId: string, userId: string) {
  const { data: membership, error } = await supabaseAdmin
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .single();

  if (error || !membership) {
    throw new Error('Forbidden: You are not a member of this workspace.');
  }
}

function isMissingTableError(code: string | undefined): boolean {
  return code === '42P01' || code === 'PGRST205';
}

function handleReputationDbError(error: { code?: string; message: string }, context: string): never {
  if (process.env.NODE_ENV === 'production' && isMissingTableError(error.code)) {
    throw new Error(
      `${context}: reputation tables missing in production schema. Run npm run db:migrate.`,
    );
  }
  if (isMissingTableError(error.code)) {
    console.warn(`[reputation] ${context}:`, error.message);
    throw new Error(`${context}: reputation tables not applied. Run npm run db:migrate.`);
  }
  throw new Error(`${context}: ${error.message}`);
}

export async function fetchListeningQueries(
  workspaceId: string,
  userId: string,
): Promise<ListeningQuery[]> {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('your-supabase-url')) {
    return [];
  }

  await verifyWorkspaceMembership(workspaceId, userId);

  const { data, error } = await supabaseAdmin
    .from('listening_queries')
    .select('id, workspace_id, query_text, query_type, platforms, is_active, created_at')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  if (error) {
    if (process.env.NODE_ENV !== 'production' && isMissingTableError(error.code)) {
      return [];
    }
    handleReputationDbError(error, 'fetchListeningQueries');
  }

  return (data ?? []) as ListeningQuery[];
}

export async function saveListeningQuery({
  workspaceId,
  userId,
  queryText,
  queryType,
  platforms,
}: {
  workspaceId: string;
  userId: string;
  queryText: string;
  queryType: string;
  platforms: string[];
}): Promise<ListeningQuery> {
  await verifyWorkspaceMembership(workspaceId, userId);

  const { data, error } = await supabaseAdmin
    .from('listening_queries')
    .insert({
      workspace_id: workspaceId,
      query_text: queryText,
      query_type: queryType,
      platforms,
      is_active: true,
    })
    .select('id, workspace_id, query_text, query_type, platforms, is_active, created_at')
    .single();

  if (error) {
    handleReputationDbError(error, 'saveListeningQuery');
  }

  return data as ListeningQuery;
}

export async function deleteListeningQuery({
  id,
  workspaceId,
  userId,
}: {
  id: string;
  workspaceId: string;
  userId: string;
}): Promise<void> {
  await verifyWorkspaceMembership(workspaceId, userId);

  const { error } = await supabaseAdmin
    .from('listening_queries')
    .delete()
    .eq('id', id)
    .eq('workspace_id', workspaceId);

  if (error) {
    handleReputationDbError(error, 'deleteListeningQuery');
  }
}

export async function fetchMentions(workspaceId: string, userId: string) {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('your-supabase-url')) {
    if (process.env.NODE_ENV === 'production') return [];
    return [];
  }

  await verifyWorkspaceMembership(workspaceId, userId);

  const { data: queries, error: queryErr } = await supabaseAdmin
    .from('listening_queries')
    .select('id')
    .eq('workspace_id', workspaceId);

  if (queryErr) {
    if (process.env.NODE_ENV !== 'production' && isMissingTableError(queryErr.code)) {
      return [];
    }
    handleReputationDbError(queryErr, 'fetchMentions');
  }

  if (!queries || queries.length === 0) return [];

  const queryIds = queries.map((q) => q.id);

  const { data: mentions, error: mentionErr } = await supabaseAdmin
    .from('mentions')
    .select('*')
    .in('query_id', queryIds)
    .order('published_at', { ascending: false });

  if (mentionErr) {
    handleReputationDbError(mentionErr, 'fetchMentions');
  }

  return mentions || [];
}

export async function fetchReviews(workspaceId: string, userId: string) {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('your-supabase-url')) {
    if (process.env.NODE_ENV === 'production') return [];
    return [];
  }

  await verifyWorkspaceMembership(workspaceId, userId);

  const { data: reviews, error } = await supabaseAdmin
    .from('external_reviews')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  if (error) {
    if (process.env.NODE_ENV !== 'production' && isMissingTableError(error.code)) {
      return [];
    }
    handleReputationDbError(error, 'fetchReviews');
  }

  return reviews || [];
}

export async function replyToReview(reviewId: string, workspaceId: string, userId: string, replyText: string) {
  await verifyWorkspaceMembership(workspaceId, userId);

  const { data, error } = await supabaseAdmin
    .from('external_reviews')
    .update({ reply_text: replyText, status: 'responded' })
    .eq('id', reviewId)
    .eq('workspace_id', workspaceId)
    .select()
    .single();

  if (error) {
    handleReputationDbError(error, 'replyToReview');
  }

  return data;
}
