import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/server';

const RequestSchema = z.object({
  workspace_id: z.string().uuid(),
  limit: z.number().int().min(1).max(50).optional(),
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

    const { workspace_id: workspaceId, limit = 20 } = parsed.data;

    const { data: queries, error: queryErr } = await supabaseAdmin
      .from('listening_queries')
      .select('id, query_text, query_type, platforms')
      .eq('workspace_id', workspaceId)
      .eq('is_active', true);

    if (queryErr) {
      return NextResponse.json({ error: queryErr.message }, { status: 500 });
    }

    if (!queries?.length) {
      return NextResponse.json({
        workspace_id: workspaceId,
        configured: false,
        mentions: [],
        message: 'No competitor or listening targets configured. Add them under Reputation → Settings.',
      });
    }

    const queryIds = queries.map((q) => q.id);
    const { data: mentions, error: mentionErr } = await supabaseAdmin
      .from('mentions')
      .select('id, query_id, source_platform, content, author_name, sentiment, published_at')
      .in('query_id', queryIds)
      .order('published_at', { ascending: false })
      .limit(limit);

    if (mentionErr) {
      return NextResponse.json({ error: mentionErr.message }, { status: 500 });
    }

    const queryMap = new Map(queries.map((q) => [q.id, q]));

    return NextResponse.json({
      workspace_id: workspaceId,
      configured: true,
      target_count: queries.length,
      mentions: (mentions ?? []).map((m) => ({
        ...m,
        query_text: queryMap.get(m.query_id)?.query_text ?? null,
        query_type: queryMap.get(m.query_id)?.query_type ?? null,
        _source: 'reputation_ingestion',
      })),
    });
  } catch (err) {
    console.error('[Tool: get-competitor-mentions]', err);
    return NextResponse.json({ error: 'Internal tool error' }, { status: 500 });
  }
}
