'use server';

import { supabaseAdmin } from '@/lib/supabase/server';
import { createActionClient } from '@/lib/supabase/action';

async function verifyWorkspaceMembership(workspaceId: string) {
  const supabase = await createActionClient();
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) throw new Error('Unauthenticated');

  const { data: member, error: memErr } = await supabaseAdmin
    .from('workspace_members')
    .select('id')
    .eq('user_id', session.user.id)
    .eq('workspace_id', workspaceId)
    .single();

  if (memErr || !member) throw new Error('Unauthorized');

  return session.user.id;
}

/**
 * Server Action to create a new social media post.
 * Verifies workspace membership and inserts a row into the `posts` table.
 */
export async function createPost({
  workspaceId,
  content,
  platforms,
  status = 'draft',
  scheduledAt,
}: {
  workspaceId: string;
  content: { text: string; media_urls?: string[] };
  platforms: string[];
  status?: 'draft' | 'scheduled' | 'published' | 'failed';
  scheduledAt: string;
}): Promise<string> {
  const userId = await verifyWorkspaceMembership(workspaceId);

  const { data, error } = await supabaseAdmin
    .from('posts')
    .insert([
      {
        workspace_id: workspaceId,
        status,
        platforms,
        content,
        scheduled_at: scheduledAt,
      },
    ])
    .select('id')
    .single();

  if (error) {
    console.error('Create post error:', error);
    throw new Error('Failed to create post');
  }

  const { auditLog } = await import('@/lib/audit');
  await auditLog(workspaceId, userId, 'post.created', {
    post_id: data.id,
    platforms,
    status,
  });

  return data.id as string;
}
