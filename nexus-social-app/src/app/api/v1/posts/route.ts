import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const auth = await authenticateApiRequest(req);
  if (!auth.ok) return auth.response;

  const { searchParams } = req.nextUrl;
  const status = searchParams.get('status');
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 100);
  const offset = parseInt(searchParams.get('offset') ?? '0', 10);

  let query = supabaseAdmin
    .from('posts')
    .select('id, content, scheduled_at, status, media_urls', { count: 'exact' })
    .eq('workspace_id', auth.workspaceId)
    .order('scheduled_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [], meta: { total: count ?? 0 } });
}

export async function POST(req: NextRequest) {
  const auth = await authenticateApiRequest(req);
  if (!auth.ok) return auth.response;

  let body: { content?: string; scheduled_at?: string; media_urls?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.content?.trim()) {
    return NextResponse.json({ error: 'content is required' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('posts')
    .insert({
      workspace_id: auth.workspaceId,
      content: body.content.trim(),
      scheduled_at: body.scheduled_at ?? new Date().toISOString(),
      status: 'scheduled',
      media_urls: body.media_urls ?? [],
    })
    .select('id, content, scheduled_at, status, media_urls')
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
