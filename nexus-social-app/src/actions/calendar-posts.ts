'use server';

import { createActionClient } from '@/lib/supabase/action';
import { supabaseAdmin } from '@/lib/supabase/server';

async function verifyPostAccess(postId: string): Promise<{ workspaceId: string }> {
  const supabase = await createActionClient();
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session) {
    throw new Error('Unauthenticated');
  }

  const { data: post, error: postError } = await supabaseAdmin
    .from('posts')
    .select('workspace_id, status')
    .eq('id', postId)
    .maybeSingle();

  if (postError || !post) {
    throw new Error('Post not found');
  }

  const { data: member, error: memberError } = await supabaseAdmin
    .from('workspace_members')
    .select('id')
    .eq('user_id', session.user.id)
    .eq('workspace_id', post.workspace_id)
    .maybeSingle();

  if (memberError || !member) {
    throw new Error('Unauthorized');
  }

  return { workspaceId: post.workspace_id as string };
}

export async function retryFailedPost(postId: string): Promise<void> {
  await verifyPostAccess(postId);

  const retryAt = new Date(Date.now() + 30_000).toISOString();
  const { error } = await supabaseAdmin
    .from('posts')
    .update({
      status: 'scheduled',
      publish_error: null,
      scheduled_at: retryAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', postId)
    .eq('status', 'failed');

  if (error) {
    throw new Error(error.message || 'Failed to retry post');
  }
}

export async function reschedulePost({
  postId,
  scheduledAt,
}: {
  postId: string;
  scheduledAt: string;
}): Promise<void> {
  await verifyPostAccess(postId);

  const { error } = await supabaseAdmin
    .from('posts')
    .update({
      scheduled_at: scheduledAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', postId);

  if (error) {
    throw new Error(error.message || 'Failed to reschedule post');
  }
}
