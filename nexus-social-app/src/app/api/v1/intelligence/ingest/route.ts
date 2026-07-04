import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/supabase/action';
import {
  ingestRawIntelligence,
  isIntelligenceSource,
  parseCsvToRows,
  type IngestRow,
  type IntelligenceSource,
} from '@/lib/intelligence/ingest-raw';
import { requestIntelligenceBriefing } from '@/lib/orchestration/workflows/intelligence-briefing-workflow';

export const runtime = 'nodejs';

async function resolveWorkspaceId(
  supabase: Awaited<ReturnType<typeof createServerComponentClient>>,
  userId: string,
): Promise<string | null> {
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  return membership?.workspace_id ?? process.env.NEXT_PUBLIC_DEFAULT_WORKSPACE_ID ?? null;
}

/**
 * POST /api/v1/intelligence/ingest
 * multipart/form-data: file (CSV) + optional source
 * application/json: { source, rows: Record[] } or { source, csv: string }
 */
export async function POST(req: NextRequest) {
  const supabase = await createServerComponentClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const workspaceId = await resolveWorkspaceId(supabase, session.user.id);
  if (!workspaceId) {
    return NextResponse.json({ error: 'No workspace membership found' }, { status: 403 });
  }

  let source: IntelligenceSource = 'manual_csv';
  let rows: IngestRow[] = [];

  const contentType = req.headers.get('content-type') ?? '';

  try {
    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      const sourceRaw = String(form.get('source') ?? 'manual_csv');
      source = isIntelligenceSource(sourceRaw) ? sourceRaw : 'manual_csv';
      const file = form.get('file');
      if (!(file instanceof File)) {
        return NextResponse.json({ error: 'file is required' }, { status: 400 });
      }
      const text = await file.text();
      rows = parseCsvToRows(text);
    } else {
      const body = (await req.json()) as {
        source?: string;
        rows?: IngestRow[];
        csv?: string;
      };
      const sourceRaw = body.source ?? 'other';
      source = isIntelligenceSource(sourceRaw) ? sourceRaw : 'other';
      if (typeof body.csv === 'string') {
        rows = parseCsvToRows(body.csv);
      } else if (Array.isArray(body.rows)) {
        rows = body.rows;
      } else {
        return NextResponse.json({ error: 'Provide rows[] or csv string' }, { status: 400 });
      }
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const result = await ingestRawIntelligence(supabase, { workspaceId, source, rows });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  // Best-effort on-demand briefing (Inngest may be unavailable in local dev)
  try {
    await requestIntelligenceBriefing(workspaceId);
  } catch (err) {
    console.warn(
      '[intelligence/ingest] briefing event not sent:',
      err instanceof Error ? err.message : err,
    );
  }

  return NextResponse.json(
    {
      success: true,
      ingestId: result.ingestId,
      rowCount: rows.length,
      anomalies: result.anomalies,
    },
    { status: 201 },
  );
}
