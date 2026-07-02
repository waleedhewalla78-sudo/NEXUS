'use server';

import { supabaseAdmin } from '@/lib/supabase/server';

export interface PageBlock {
  id: string;
  type: 'header' | 'link' | 'image' | 'text';
  content: Record<string, any>;
}

export async function createOrUpdatePage({
  workspaceId,
  slug,
  title,
  blocks,
  theme,
  isPublished,
}: {
  workspaceId: string;
  slug: string;
  title: string;
  blocks: PageBlock[];
  theme?: Record<string, any>;
  isPublished?: boolean;
}) {
  const { data: member } = await supabaseAdmin
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', workspaceId)
    .single();

  if (!member) throw new Error('Unauthorized');

  const { data, error } = await supabaseAdmin
    .from('nexus_pages')
    .upsert(
      {
        workspace_id: workspaceId,
        slug,
        title,
        blocks,
        theme: theme || {},
        is_published: isPublished ?? false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'slug' }
    )
    .select()
    .single();

  if (error) throw new Error(`Failed to save page: ${error.message}`);
  return data;
}

export async function trackPageClick(pageId: string, url: string) {
  // Fire and forget click tracking
  await supabaseAdmin.from('nexus_page_clicks').insert({
    page_id: pageId,
    link_url: url,
  });
}
