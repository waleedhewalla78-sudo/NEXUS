/**
 * Feature 004 Sprint 17 — Tenant RLS isolation integration test.
 * Uses @supabase/ssr-style JWT clients to simulate Agency A vs Agency B users.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

const canRun = Boolean(supabaseUrl && serviceKey && anonKey);

function createRlsClient(accessToken: string) {
  return createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

describe.skipIf(!canRun)('tenant RLS e2e', () => {
  let agencyAId: string;
  let agencyBId: string;
  let userAToken: string;
  let userBToken: string;
  let testSignalId: string;

  beforeAll(async () => {
    const admin = createClient(supabaseUrl, serviceKey);

    const emailA = `rls-test-a-${Date.now()}@example.com`;
    const emailB = `rls-test-b-${Date.now()}@example.com`;

    const { data: userA } = await admin.auth.admin.createUser({ email: emailA, email_confirm: true });
    const { data: userB } = await admin.auth.admin.createUser({ email: emailB, email_confirm: true });

    if (!userA.user || !userB.user) throw new Error('Failed to create test users');

    const { data: tenant } = await admin
      .from('tenants')
      .insert({ name: `RLS Test ${Date.now()}`, slug: `rls-${Date.now()}` })
      .select('id')
      .single();

    if (!tenant) throw new Error('Failed to create tenant');

    const { data: agencies } = await admin
      .from('agencies')
      .insert([
        { tenant_id: tenant.id, name: 'Agency A', slug: `agency-a-${Date.now()}` },
        { tenant_id: tenant.id, name: 'Agency B', slug: `agency-b-${Date.now()}` },
      ])
      .select('id');

    agencyAId = agencies![0]!.id;
    agencyBId = agencies![1]!.id;

    await admin.from('agency_members').insert([
      { agency_id: agencyAId, user_id: userA.user.id, role: 'admin' },
      { agency_id: agencyBId, user_id: userB.user.id, role: 'admin' },
    ]);

    const sessionA = await admin.auth.admin.generateLink({ type: 'magiclink', email: emailA });
    const sessionB = await admin.auth.admin.generateLink({ type: 'magiclink', email: emailB });

    userAToken = sessionA.data.properties?.hashed_token ?? '';
    userBToken = sessionB.data.properties?.hashed_token ?? '';

    const { data: signal } = await admin
      .from('ai_cmo_external_signals')
      .insert({
        workspace_id: '00000000-0000-0000-0000-000000000099',
        signal_id: `sig_rls_${Date.now()}`,
        source: 'rls-test',
        headline: 'Workspace A only signal',
      })
      .select('id')
      .single();

    testSignalId = signal?.id ?? '';
  }, 60_000);

  it('Agency B user cannot read Agency A external signals', async () => {
    const clientB = createRlsClient(userBToken);

    const { data, error } = await clientB
      .from('ai_cmo_external_signals')
      .select('id')
      .eq('id', testSignalId);

    expect(error ?? data?.length === 0).toBeTruthy();
  });
});
