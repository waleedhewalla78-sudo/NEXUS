import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/supabase/action';

export const runtime = 'nodejs';

/**
 * GET /api/v1/intelligence/feed?from=&to=
 * Unified timeline: briefs + ingests for the session workspace.
 */
export async function GET(req: NextRequest) {
  const supabase = await createServerComponentClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  const workspaceId =
    membership?.workspace_id ?? process.env.NEXT_PUBLIC_DEFAULT_WORKSPACE_ID ?? null;

  if (!workspaceId) {
    return NextResponse.json({ error: 'No workspace membership found' }, { status: 403 });
  }

  const from = req.nextUrl.searchParams.get('from');
  const to = req.nextUrl.searchParams.get('to');

  let briefsQuery = supabase
    .from('intelligence_briefs')
    .select('id, brief_text, status, ingest_ids, created_at')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(50);

  let ingestsQuery = supabase
    .from('intelligence_ingests')
    .select('id, source, row_count, brief_status, anomalies, created_at')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (from) {
    briefsQuery = briefsQuery.gte('created_at', from);
    ingestsQuery = ingestsQuery.gte('created_at', from);
  }
  if (to) {
    briefsQuery = briefsQuery.lte('created_at', to);
    ingestsQuery = ingestsQuery.lte('created_at', to);
  }

  const [briefsRes, ingestsRes] = await Promise.all([briefsQuery, ingestsQuery]);

  if (briefsRes.error || ingestsRes.error) {
    return NextResponse.json(
      { error: briefsRes.error?.message ?? ingestsRes.error?.message },
      { status: 500 },
    );
  }

  type FeedItem =
    | { kind: 'brief'; id: string; created_at: string; brief_text: string; status: string }
    | {
        kind: 'ingest';
        id: string;
        created_at: string;
        source: string;
        row_count: number;
        brief_status: string;
        anomalies: unknown[];
      };

  const items: FeedItem[] = [
    ...(briefsRes.data ?? []).map((b) => ({
      kind: 'brief' as const,
      id: b.id,
      created_at: b.created_at,
      brief_text: b.brief_text,
      status: b.status,
    })),
    ...(ingestsRes.data ?? []).map((i) => ({
      kind: 'ingest' as const,
      id: i.id,
      created_at: i.created_at,
      source: i.source,
      row_count: i.row_count,
      brief_status: i.brief_status,
      anomalies: (i.anomalies as unknown[]) ?? [],
    })),
  ].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://nexussocial.tech'}/api/v1/enterprise/leads/meta-ads`;

  return NextResponse.json({ items, webhookUrl });
}
