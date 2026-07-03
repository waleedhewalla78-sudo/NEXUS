/**
 * Cryptographic audit PDF generator — queries audit_logs and signs with HMAC.
 */

import crypto from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getWorkspaceComplianceProfile } from '@/lib/governance/compliance-profile-store';
import { MENA_V1_PROFILE_ID } from '@/lib/governance/compliance-profiles/mena-v1';

export type AuditPdfInput = {
  workspaceId: string;
  start: Date;
  end: Date;
};

function escapePdfText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function buildMinimalPdf(lines: string[]): Buffer {
  const contentLines = lines.map((line, i) => {
    const y = 780 - i * 14;
    return `BT /F1 10 Tf 50 ${y} Td (${escapePdfText(line)}) Tj ET`;
  });

  const stream = `${contentLines.join('\n')}\n`;
  const streamLen = Buffer.byteLength(stream, 'utf8');

  const objects = [
    '1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj',
    '2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj',
    '3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>endobj',
    `4 0 obj<< /Length ${streamLen} >>stream\n${stream}endstream\nendobj`,
    '5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];

  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += `${obj}\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, 'utf8');
}

function signAuditLines(secret: string, lines: string[]): string {
  return crypto.createHmac('sha256', secret).update(lines.join('\n')).digest('hex');
}

export async function generateAuditPdf(input: AuditPdfInput): Promise<{ pdf: Buffer; signature: string; rowCount: number }> {
  const { data: rowsData, error } = await supabaseAdmin
    .from('audit_logs')
    .select('action, metadata, created_at, actor_id')
    .eq('workspace_id', input.workspaceId)
    .gte('created_at', input.start.toISOString())
    .lte('created_at', input.end.toISOString())
    .order('created_at', { ascending: true })
    .limit(500);

  const rows = rowsData ?? [];

  if (error) {
    throw new Error(error.message);
  }

  const compliance = await getWorkspaceComplianceProfile(input.workspaceId);
  const complianceAttestation =
    compliance.profileId === MENA_V1_PROFILE_ID
      ? `MENA Compliance Pack v1 ACTIVE — jurisdictions: ${compliance.meta.jurisdictions.join(', ')}; Arabic register: ${compliance.meta.arabicRegister}`
      : 'Compliance profile: global_default (no MENA pack attestation)';

  const header = [
    'Nexus Social — Immutable Audit Report',
    `Workspace: ${input.workspaceId}`,
    `Period: ${input.start.toISOString()} → ${input.end.toISOString()}`,
    `Entries: ${rows.length}`,
    complianceAttestation,
    '---',
  ];

  const body = rows.map((row) => {
    const ts = String(row.created_at).slice(0, 19);
    const meta = JSON.stringify(row.metadata ?? {}).slice(0, 120);
    return `${ts} | ${row.action} | actor=${row.actor_id ?? 'system'} | ${meta}`;
  });

  const secret =
    process.env.APPROVAL_HMAC_SECRET ??
    process.env.INTERNAL_TOOL_SECRET ??
    'dev-audit-signing-key';

  const signature = signAuditLines(secret, [...header, ...body]);
  const footer = ['---', `HMAC-SHA256: ${signature}`, 'This report is cryptographically signed and tamper-evident.'];

  const pdf = buildMinimalPdf([...header, ...body.slice(0, 45), ...footer]);

  return { pdf, signature, rowCount: rows.length };
}

export const auditPdfUtils = {
  generateAuditPdf,
};
