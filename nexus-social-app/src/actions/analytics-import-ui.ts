'use server';

import { getUserWorkspaceContext } from '@/lib/auth/server-session';
import { buildPaidMediaImportReport } from '@/lib/analytics/paid-media/import-report';
import { emitPaidMediaQuantHints } from '@/lib/analytics/paid-media/emit-quant-hints';

export async function importPaidMediaFromSession(formData: FormData): Promise<
  | {
      ok: true;
      report: ReturnType<typeof buildPaidMediaImportReport> & { workspaceId: string };
    }
  | { ok: false; error: string }
> {
  const file = formData.get('file');
  const breakdown = (formData.get('breakdown') as string | null) ?? 'campaign';

  if (!(file instanceof File)) {
    return { ok: false, error: 'Missing CSV file' };
  }

  const breakdownLevel =
    breakdown === 'adset' ? 'adset' : breakdown === 'ad' ? 'ad' : 'campaign';

  try {
    const text = await file.text();
    const report = buildPaidMediaImportReport(text, breakdownLevel);
    const { workspaceId } = await getUserWorkspaceContext();

    try {
      await emitPaidMediaQuantHints(workspaceId, report);
    } catch {
      // Quant hint emit is best-effort; import UI still returns report
    }

    return { ok: true, report: { ...report, workspaceId } };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Import failed';
    return { ok: false, error: message };
  }
}
