import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/server';

const RequestSchema = z.object({
  workspace_id: z.string().uuid(),
});

function authorizeTool(req: Request): boolean {
  const secret = process.env.INTERNAL_TOOL_SECRET;
  const authHeader = req.headers.get('authorization');
  return Boolean(secret && authHeader === `Bearer ${secret}`);
}

export async function POST(req: Request) {
  try {
    if (!authorizeTool(req)) {
      return NextResponse.json({ error: 'Unauthorized tool access' }, { status: 401 });
    }

    const payload = await req.json();
    const parsed = RequestSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid parameters', details: parsed.error }, { status: 400 });
    }

    const { workspace_id: workspaceId } = parsed.data;

    const { data, error } = await supabaseAdmin.rpc('get_workspace_analytics', {
      p_workspace_id: workspaceId,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const row = (data?.[0] ?? {}) as Record<string, unknown>;

    return NextResponse.json({
      workspace_id: workspaceId,
      total_posts: Number(row.total_posts ?? 0),
      published_posts: Number(row.published_posts ?? 0),
      draft_posts: Number(row.draft_posts ?? 0),
      posts_by_platform: row.posts_by_platform ?? [],
      posts_over_time: row.posts_over_time ?? [],
      engagement: {
        total_impressions: Number(row.total_impressions ?? 0),
        total_reach: Number(row.total_reach ?? 0),
        total_engagement: Number(row.total_engagement ?? 0),
        by_platform: row.engagement_by_platform ?? [],
        over_time: row.engagement_over_time ?? [],
      },
      _source: 'post_analytics',
    });
  } catch (err) {
    console.error('[Tool: get-workspace-analytics]', err);
    return NextResponse.json({ error: 'Internal tool error' }, { status: 500 });
  }
}
