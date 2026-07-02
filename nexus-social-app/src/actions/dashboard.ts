'use server';

import { supabaseAdmin } from '@/lib/supabase/server';
import { createActionClient } from '@/lib/supabase/action';
import { getAnalytics } from '@/actions/getAnalytics';

export interface DashboardPost {
  id: string;
  status: string;
  platforms: string[];
  text: string;
  scheduled_at: string | null;
  created_at: string;
}

export interface DashboardData {
  userName: string;
  workspaceName: string;
  stats: {
    totalPosts: number;
    publishedPosts: number;
    draftPosts: number;
    scheduledPosts: number;
  };
  recentPosts: DashboardPost[];
  announcements: { id: string; title: string; body: string; type: 'info' | 'warning' }[];
}

async function verifyMembership(workspaceId: string, userId: string) {
  const { data } = await supabaseAdmin
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .maybeSingle();
  if (!data) throw new Error('Unauthorized');
}

export async function getDashboardData(workspaceId: string): Promise<DashboardData> {
  const supabase = await createActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthenticated');

  await verifyMembership(workspaceId, user.id);

  const displayName =
    (user.user_metadata?.full_name as string | undefined) ||
    user.email?.split('@')[0] ||
    'there';

  const { data: workspace } = await supabaseAdmin
    .from('workspaces')
    .select('name')
    .eq('id', workspaceId)
    .maybeSingle();

  const analytics = await getAnalytics({ workspaceId, userId: user.id });
  const stats = {
    totalPosts: analytics.totalPosts,
    publishedPosts: analytics.publishedPosts,
    draftPosts: analytics.draftPosts,
    scheduledPosts: 0,
  };

  const { data: posts, error } = await supabaseAdmin
    .from('posts')
    .select('id, status, platforms, content, scheduled_at, created_at')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(8);

  if (error) {
    console.warn('[dashboard] posts fetch:', error.message);
  }

  const recentPosts: DashboardPost[] = (posts ?? []).map((p) => ({
    id: p.id as string,
    status: p.status as string,
    platforms: (p.platforms as string[]) ?? [],
    text: ((p.content as { text?: string })?.text) ?? '',
    scheduled_at: (p.scheduled_at as string | null) ?? null,
    created_at: p.created_at as string,
  }));

  stats.scheduledPosts = recentPosts.filter((p) => p.status === 'scheduled').length;

  const announcements: DashboardData['announcements'] = [
    {
      id: 'welcome',
      title: 'Welcome to Nexus Social',
      body: 'Schedule posts from Create Post, manage conversations in Inbox, and tune your AI agent in Settings.',
      type: 'info',
    },
  ];

  if (stats.draftPosts > 0) {
    announcements.push({
      id: 'drafts',
      title: `${stats.draftPosts} draft post${stats.draftPosts === 1 ? '' : 's'} waiting`,
      body: 'Review and schedule drafts from the Calendar or Create Post.',
      type: 'info',
    });
  }

  return {
    userName: displayName,
    workspaceName: (workspace?.name as string) ?? 'Your workspace',
    stats,
    recentPosts,
    announcements,
  };
}
