import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import {
  checkInboundLeadRateLimit,
  extractClientIp,
  resolveEnterpriseLeadsWorkspaceId,
  validateInboundLeadPayload,
} from '@/lib/enterprise/leads';

export const runtime = 'nodejs';

/**
 * POST /api/v1/enterprise/leads/inbound
 * Public website form / webhook ingestion (rate limited by IP).
 */
export async function POST(req: NextRequest) {
  const clientIp = extractClientIp(req);
  if (!checkInboundLeadRateLimit(clientIp)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const validated = validateInboundLeadPayload(rawBody);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const workspaceId = resolveEnterpriseLeadsWorkspaceId();
  const lead = validated.data;

  const { data, error } = await supabaseAdmin
    .from('enterprise_leads')
    .insert({
      workspace_id: workspaceId,
      source: lead.source,
      status: 'new',
      first_name: lead.firstName,
      last_name: lead.lastName,
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
      message: lead.message,
      metadata: { client_ip: clientIp, ingested_via: 'inbound_api' },
    })
    .select('id')
    .single();

  if (error || !data?.id) {
    console.error('[enterprise/leads/inbound] insert failed:', error?.message);
    return NextResponse.json(
      { error: error?.message ?? 'Failed to create lead' },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, leadId: data.id }, { status: 201 });
}
