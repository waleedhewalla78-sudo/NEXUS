'use server';

import { supabaseAdmin } from '@/lib/supabase/server';
import { createActionClient } from '@/lib/supabase/action';

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  href: string;
  created_at: string;
  read: boolean;
}

function isMissingTableError(code?: string) {
  return code === '42P01' || code === 'PGRST205';
}

async function computeNotifications(workspaceId: string): Promise<AppNotification[]> {
  const notifications: AppNotification[] = [];
  const now = new Date().toISOString();

  const { data: drafts } = await supabaseAdmin
    .from('posts')
    .select('id, content, created_at')
    .eq('workspace_id', workspaceId)
    .eq('status', 'draft')
    .order('created_at', { ascending: false })
    .limit(3);

  for (const post of drafts ?? []) {
    const text = ((post.content as { text?: string })?.text ?? '').slice(0, 60);
    notifications.push({
      id: `draft-${post.id}`,
      title: 'Draft post needs review',
      body: text || 'Untitled draft',
      href: '/posts/create',
      created_at: (post.created_at as string) ?? now,
      read: false,
    });
  }

  const { data: scheduled } = await supabaseAdmin
    .from('posts')
    .select('id, content, scheduled_at')
    .eq('workspace_id', workspaceId)
    .eq('status', 'scheduled')
    .gte('scheduled_at', now)
    .order('scheduled_at', { ascending: true })
    .limit(3);

  for (const post of scheduled ?? []) {
    notifications.push({
      id: `scheduled-${post.id}`,
      title: 'Upcoming scheduled post',
      body: new Date(post.scheduled_at as string).toLocaleString(),
      href: '/calendar',
      created_at: (post.scheduled_at as string) ?? now,
      read: false,
    });
  }

  const { data: reviews, error: reviewError } = await supabaseAdmin
    .from('external_reviews')
    .select('id, platform, author_name, created_at')
    .eq('workspace_id', workspaceId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(3);

  if (!reviewError) {
    for (const review of reviews ?? []) {
      notifications.push({
        id: `review-${review.id}`,
        title: `New ${review.platform} review`,
        body: `From ${review.author_name ?? 'Anonymous'}`,
        href: '/reputation',
        created_at: (review.created_at as string) ?? now,
        read: false,
      });
    }
  }

  if (notifications.length === 0) {
    notifications.push({
      id: 'inbox-tip',
      title: 'Unified Inbox ready',
      body: 'Connect WhatsApp or SMS in Settings to receive live conversations.',
      href: '/settings',
      created_at: now,
      read: true,
    });
  }

  return notifications.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

async function syncPersistentNotifications(
  userId: string,
  workspaceId: string,
  computed: AppNotification[],
) {
  if (!computed.length) return;

  const rows = computed.map((n) => ({
    id: n.id,
    user_id: userId,
    workspace_id: workspaceId,
    title: n.title,
    body: n.body,
    href: n.href,
    created_at: n.created_at,
    read: n.read,
  }));

  const { error } = await supabaseAdmin
    .from('user_notifications')
    .upsert(rows, { onConflict: 'user_id,workspace_id,id', ignoreDuplicates: false });

  if (isMissingTableError(error?.code)) return;
}

export async function getNotifications(workspaceId: string): Promise<AppNotification[]> {
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

  const computed = await computeNotifications(workspaceId);
  await syncPersistentNotifications(user.id, workspaceId, computed);

  const { data: persisted, error } = await supabaseAdmin
    .from('user_notifications')
    .select('id, title, body, href, created_at, read')
    .eq('user_id', user.id)
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (isMissingTableError(error?.code) || error || !persisted?.length) {
    return computed;
  }

  return persisted.map((n) => ({
    id: n.id as string,
    title: n.title as string,
    body: n.body as string,
    href: n.href as string,
    created_at: n.created_at as string,
    read: Boolean(n.read),
  }));
}

export async function markNotificationRead(
  workspaceId: string,
  notificationId: string,
): Promise<void> {
  const supabase = await createActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabaseAdmin
    .from('user_notifications')
    .update({ read: true })
    .eq('user_id', user.id)
    .eq('workspace_id', workspaceId)
    .eq('id', notificationId);

  if (isMissingTableError(error?.code)) return;
}
