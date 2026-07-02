'use server';

import { supabaseAdmin } from '@/lib/supabase/server';
import { createActionClient } from '@/lib/supabase/action';

export interface SearchResult {
  id: string;
  type: 'post' | 'route' | 'member';
  title: string;
  subtitle?: string;
  href: string;
}

const STATIC_ROUTES: Omit<SearchResult, 'id'>[] = [
  { type: 'route', title: 'Dashboard', href: '/', subtitle: 'Home & KPIs' },
  { type: 'route', title: 'Calendar', href: '/calendar', subtitle: 'Scheduled posts' },
  { type: 'route', title: 'Create Post', href: '/posts/create', subtitle: 'Composer' },
  { type: 'route', title: 'Inbox', href: '/inbox', subtitle: 'Unified messaging' },
  { type: 'route', title: 'Analytics', href: '/analytics', subtitle: 'Performance charts' },
  { type: 'route', title: 'Reputation', href: '/reputation', subtitle: 'Reviews & mentions' },
  { type: 'route', title: 'Automations', href: '/automations/builder', subtitle: 'Workflow builder' },
  { type: 'route', title: 'Integrations', href: '/settings', subtitle: 'Settings hub' },
  { type: 'route', title: 'Profile', href: '/settings/profile', subtitle: 'Display name' },
  { type: 'route', title: 'Security', href: '/settings/security', subtitle: 'Password' },
  { type: 'route', title: 'Team', href: '/settings/team', subtitle: 'Members & roles' },
  { type: 'route', title: 'AI Agent', href: '/settings/ai-agent', subtitle: 'Kill switch & canary' },
  { type: 'route', title: 'Admin Console', href: '/admin', subtitle: 'Health monitoring' },
];

export async function globalSearch(workspaceId: string, query: string): Promise<SearchResult[]> {
  const q = query.trim().toLowerCase();
  if (!q || q.length < 2) return [];

  const supabase = await createActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: member } = await supabaseAdmin
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!member) return [];

  const results: SearchResult[] = [];

  for (const route of STATIC_ROUTES) {
    const haystack = `${route.title} ${route.subtitle ?? ''} ${route.href}`.toLowerCase();
    if (haystack.includes(q)) {
      results.push({ ...route, id: `route-${route.href}` });
    }
  }

  const { data: posts } = await supabaseAdmin
    .from('posts')
    .select('id, content, status, platforms')
    .eq('workspace_id', workspaceId)
    .limit(20);

  for (const post of posts ?? []) {
    const text = ((post.content as { text?: string })?.text ?? '').toLowerCase();
    const status = String(post.status ?? '').toLowerCase();
    if (text.includes(q) || status.includes(q)) {
      results.push({
        id: `post-${post.id}`,
        type: 'post',
        title: ((post.content as { text?: string })?.text ?? 'Untitled post').slice(0, 60),
        subtitle: `${post.status} · ${(post.platforms as string[] | null)?.join(', ') ?? 'no platform'}`,
        href: '/calendar',
      });
    }
  }

  const { data: members } = await supabaseAdmin
    .from('workspace_members')
    .select('user_id')
    .eq('workspace_id', workspaceId);

  const userIds = (members ?? []).map((m) => m.user_id as string);
  if (userIds.length) {
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .in('id', userIds);

    for (const u of users ?? []) {
      const email = (u.email as string).toLowerCase();
      if (email.includes(q)) {
        results.push({
          id: `member-${u.id}`,
          type: 'member',
          title: u.email as string,
          subtitle: 'Team member',
          href: '/settings/team',
        });
      }
    }
  }

  return results.slice(0, 12);
}
