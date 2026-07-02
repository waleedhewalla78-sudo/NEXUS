import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/api-auth';
import { generateAuditPdf } from '@/lib/reports/audit-pdf';

/**
 * Signed immutable audit PDF export.
 * GET /api/reports/audit-pdf?start=ISO&end=ISO
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateApiRequest(req);
  if (!auth.ok) return auth.response;

  const startParam = req.nextUrl.searchParams.get('start');
  const endParam = req.nextUrl.searchParams.get('end');

  const end = endParam ? new Date(endParam) : new Date();
  const start = startParam ? new Date(startParam) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return NextResponse.json({ error: 'Invalid start or end date' }, { status: 400 });
  }

  try {
    const { pdf, signature, rowCount } = await generateAuditPdf({
      workspaceId: auth.workspaceId,
      start,
      end,
    });

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="nexus-audit-${start.toISOString().slice(0, 10)}.pdf"`,
        'X-Audit-Signature': signature,
        'X-Audit-Row-Count': String(rowCount),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'PDF generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
