import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/supabase/action';
import { supabaseAdmin } from '@/lib/supabase/server';
import {
  queryAttributionChannels,
  aggregateAttributionForChart,
  isMissingTableError,
} from '@/lib/ai-cmo/abm/accounts-query';
import { resolveAbmWorkspaceId } from '@/lib/ai-cmo/abm/resolve-abm-workspace';

/**
 * GET /api/v1/ai-cmo/abm/attribution
 * Returns channel-level attribution_reports rows + aggregated chart series.
 */
export async function GET(req: NextRequest) {
  const resolved = await resolveAbmWorkspaceId(req);
  if ('response' in resolved) return resolved.response;

  const supabase = resolved.useAdmin ? supabaseAdmin : await createServerComponentClient();
  const { rows, error } = await queryAttributionChannels(supabase, resolved.workspaceId);

  if (error) {
    if (isMissingTableError(error)) {
      return NextResponse.json(
        {
          rows: [],
          chart: [],
          workspaceId: resolved.workspaceId,
          configured: false,
        },
        { status: 200 },
      );
    }
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({
    rows,
    chart: aggregateAttributionForChart(rows),
    workspaceId: resolved.workspaceId,
    configured: rows.length > 0,
    source: 'attribution_reports',
  });
}
