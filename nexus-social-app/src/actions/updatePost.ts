'use server';

// src/actions/updatePost.ts
import { supabaseAdmin } from '@/lib/supabase/server';

/**
 * Server Action to update an existing social media post.
 * Ensures the post belongs to the provided workspace before updating.
 */
export async function updatePost({
  postId,
  workspaceId,
  payload,
}: {
  postId: string;
  workspaceId: string;
  payload: {
    content?: { text?: string; media_urls?: string[] };
    platforms?: string[];
    status?: 'draft' | 'scheduled' | 'published' | 'failed';
    scheduled_at?: string; // ISO timestamp
  };
}): Promise<void> {
  // Verify the post belongs to the workspace (optional safety check)
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('posts')
    .select('id')
    .eq('id', postId)
    .eq('workspace_id', workspaceId)
    .single();

  if (fetchError) {
    console.error('Fetch post error (update validation):', fetchError);
    throw new Error('Post not found or access denied');
  }

  // Apply the update
  const { error: updateError } = await supabaseAdmin
    .from('posts')
    .update(payload)
    .eq('id', postId);

  if (updateError) {
    console.error('Update post error:', updateError);
    throw new Error('Failed to update post');
  }
}
