import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/api-auth';
import { buildPaidMediaImportReport } from '@/lib/analytics/paid-media/import-report';
import { emitPaidMediaQuantHints } from '@/lib/analytics/paid-media/emit-quant-hints';

export async function POST(req: NextRequest) {
  const auth = await authenticateApiRequest(req);
  if (!auth.ok) return auth.response;

  const form = await req.formData();
  const file = form.get('file');
  const breakdown = (form.get('breakdown') as string | null) ?? 'campaign';

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file field (CSV)' }, { status: 400 });
  }

  const text = await file.text();
  const breakdownLevel =
    breakdown === 'adset' ? 'adset' : breakdown === 'ad' ? 'ad' : 'campaign';

  try {
    const report = buildPaidMediaImportReport(text, breakdownLevel);
    try {
      await emitPaidMediaQuantHints(auth.workspaceId, report);
    } catch {
      // Best-effort Quant hint emit
    }

    return NextResponse.json({
      workspaceId: auth.workspaceId,
      ...report,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Import failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
