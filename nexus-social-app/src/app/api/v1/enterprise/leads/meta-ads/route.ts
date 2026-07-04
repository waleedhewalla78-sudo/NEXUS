import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import {
  parseMetaLeadFieldData,
  verifyMetaLeadAdsSignature,
} from '@/lib/enterprise/meta-lead-ads';
import { resolveEnterpriseLeadsWorkspaceId } from '@/lib/enterprise/leads';

export const runtime = 'nodejs';

/**
 * Meta Lead Ads webhook — ingest lead form submissions into enterprise_leads.
 * Does NOT require Meta App Review (B1); uses Lead Ads webhook subscription.
 *
 * POST /api/v1/enterprise/leads/meta-ads
 * Auth: X-Hub-Signature-256 via META_WEBHOOK_SECRET (or META_APP_SECRET fallback)
 *
 * GET — Meta subscription verification (hub.challenge)
 */
export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get('hub.mode');
  const token = req.nextUrl.searchParams.get('hub.verify_token');
  const challenge = req.nextUrl.searchParams.get('hub.challenge');
  const expected =
    process.env.META_WEBHOOK_VERIFY_TOKEN ?? process.env.META_WEBHOOK_SECRET ?? '';

  if (mode === 'subscribe' && expected && token === expected && challenge) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  if (!verifyMetaLeadAdsSignature(req, rawBody)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Support direct field_data payload (simulations) and Meta entry wrappers.
  const candidates: unknown[] = [payload];
  const asObj = payload as { entry?: Array<{ changes?: Array<{ value?: unknown }> }> };
  if (Array.isArray(asObj.entry)) {
    for (const entry of asObj.entry) {
      for (const change of entry.changes ?? []) {
        if (change.value) candidates.push(change.value);
      }
    }
  }

  let lead = null as ReturnType<typeof parseMetaLeadFieldData>;
  for (const candidate of candidates) {
    lead = parseMetaLeadFieldData(candidate);
    if (lead) break;
  }

  if (!lead) {
    return NextResponse.json({ error: 'No valid lead field_data found' }, { status: 400 });
  }

  const workspaceId = resolveEnterpriseLeadsWorkspaceId();

  const { data, error } = await supabaseAdmin
    .from('enterprise_leads')
    .insert({
      workspace_id: workspaceId,
      source: 'meta_ads',
      status: 'new',
      first_name: lead.firstName,
      last_name: lead.lastName,
      email: lead.email,
      phone: lead.phone,
      company: null,
      message: lead.fullName ? `Meta Lead Ads: ${lead.fullName}` : 'Meta Lead Ads submission',
      metadata: {
        ingested_via: 'meta_lead_ads',
        field_data: (payload as { field_data?: unknown }).field_data ?? null,
      },
    })
    .select('id')
    .single();

  if (error || !data?.id) {
    console.error('[enterprise/leads/meta-ads] insert failed:', error?.message);
    return NextResponse.json(
      { error: error?.message ?? 'Failed to create lead' },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, leadId: data.id }, { status: 200 });
}
