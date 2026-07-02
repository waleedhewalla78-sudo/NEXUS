'use server';

import { getUserWorkspaceContext } from '@/lib/auth/server-session';
import { createServerComponentClient } from '@/lib/supabase/action';
import {
  buildContentCalendarHtml,
  type CalendarExportEntry,
} from '@/lib/ai-cmo/exports/content-calendar-html';

function extractContentPreview(content: unknown): string {
  if (typeof content === 'string') return content;
  if (content && typeof content === 'object') {
    const obj = content as Record<string, unknown>;
    if (typeof obj.body === 'string') return obj.body;
    if (typeof obj.text === 'string') return obj.text;
    if (typeof obj.caption === 'string') return obj.caption;
    return JSON.stringify(obj).slice(0, 300);
  }
  return '';
}

export async function exportCampaignCalendarHtml(): Promise<
  | { ok: true; filename: string; html: string }
  | { ok: false; error: string }
> {
  const { workspaceId } = await getUserWorkspaceContext();
  const supabase = await createServerComponentClient();

  const now = new Date();
  const rangeEnd = new Date(now);
  rangeEnd.setDate(rangeEnd.getDate() + 30);

  const [{ data: workspace }, { data: campaigns }, { data: pieces }] = await Promise.all([
    supabase.from('workspaces').select('name').eq('id', workspaceId).maybeSingle(),
    supabase
      .from('ai_cmo_campaigns')
      .select('id, name, status, created_at, updated_at')
      .eq('workspace_id', workspaceId)
      .in('status', ['active', 'planning', 'completed', 'draft'])
      .order('updated_at', { ascending: false })
      .limit(100),
    supabase
      .from('ai_cmo_content_pieces')
      .select('campaign_id, content, created_at, post_id')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: true }),
  ]);

  const postIds = (pieces ?? [])
    .map((p) => p.post_id as string | null)
    .filter((id): id is string => Boolean(id));

  let postsById = new Map<string, { scheduled_at: string | null; platform: string | null }>();
  if (postIds.length > 0) {
    const { data: posts } = await supabase
      .from('posts')
      .select('id, scheduled_at, platform')
      .in('id', postIds);
    postsById = new Map(
      (posts ?? []).map((p) => [
        p.id as string,
        { scheduled_at: p.scheduled_at as string | null, platform: p.platform as string | null },
      ]),
    );
  }

  const campaignById = new Map(
    (campaigns ?? []).map((c) => [c.id as string, c as { name: string; status: string }]),
  );

  const entries: CalendarExportEntry[] = [];

  for (const piece of pieces ?? []) {
    const campaignId = piece.campaign_id as string | null;
    const campaign = campaignId ? campaignById.get(campaignId) : undefined;
    const post = piece.post_id ? postsById.get(piece.post_id as string) : undefined;
    const eventDate = post?.scheduled_at ?? (piece.created_at as string);

    const d = new Date(eventDate);
    if (d < now || d > rangeEnd) continue;

    entries.push({
      date: d.toISOString().slice(0, 10),
      campaignName: campaign?.name ?? 'Untitled campaign',
      campaignStatus: campaign?.status ?? 'unknown',
      contentPreview: extractContentPreview(piece.content),
      platform: post?.platform ?? undefined,
      scheduledAt: post?.scheduled_at ?? null,
    });
  }

  for (const c of campaigns ?? []) {
    const updated = new Date(c.updated_at as string);
    if (updated < now || updated > rangeEnd) continue;
    if (entries.some((e) => e.campaignName === c.name)) continue;
    entries.push({
      date: updated.toISOString().slice(0, 10),
      campaignName: c.name as string,
      campaignStatus: c.status as string,
      contentPreview: '(Campaign milestone — no content piece linked)',
    });
  }

  entries.sort((a, b) => a.date.localeCompare(b.date));

  const html = buildContentCalendarHtml({
    workspaceName: (workspace?.name as string) ?? 'Workspace',
    generatedAt: now.toISOString(),
    rangeStart: now.toISOString().slice(0, 10),
    rangeEnd: rangeEnd.toISOString().slice(0, 10),
    entries,
  });

  return {
    ok: true,
    filename: `content-calendar-${now.toISOString().slice(0, 10)}.html`,
    html,
  };
}
