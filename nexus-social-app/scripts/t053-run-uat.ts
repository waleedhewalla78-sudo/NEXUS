/**
 * T053 — Automated publish UAT (when OAuth env or Facebook page token is configured).
 * Creates a due scheduled post, runs publishDuePosts(), verifies external_post_id.
 *
 * Usage:
 *   npx tsx scripts/t053-run-uat.ts [workspace-id] [platform]
 *   npm run uat:t053
 *   npm run uat:t053:sandbox   # mock Graph API — no live OAuth credentials required
 *
 * Requires: SUPABASE_SERVICE_ROLE_KEY, TOKEN_ENCRYPTION_KEY, and one of:
 *   - FACEBOOK_PAGE_ID + FACEBOOK_PAGE_ACCESS_TOKEN (platform facebook)
 *   - Seeded workspace_social_connections row for linkedin/x
 *   - --sandbox flag (seeds connection + mocks Graph API)
 */
import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const WALKTHROUGH_WORKSPACE_ID = '11111111-1111-1111-1111-111111111111';
const SANDBOX_PAGE_ID = 'sandbox-page-001';

function loadEnvFile(relativePath: string) {
  const full = join(scriptDir, '..', relativePath);
  if (!existsSync(full)) return;
  for (const line of readFileSync(full, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile('.env');
loadEnvFile('.env.local');

function envOk(name: string): boolean {
  const v = process.env[name]?.trim() ?? '';
  return Boolean(v && !/placeholder|your_|changeme|^xxx$/i.test(v));
}

function parseArgs() {
  const sandboxMode = process.argv.includes('--sandbox');
  const positional = process.argv.filter((arg) => !arg.startsWith('--'));
  const workspaceId = positional[2] ?? process.env.UAT_WORKSPACE_ID ?? WALKTHROUGH_WORKSPACE_ID;
  const platform = sandboxMode
    ? 'facebook'
    : (positional[3] ?? process.env.UAT_PLATFORM ?? 'facebook').toLowerCase();
  return { sandboxMode, workspaceId, platform };
}

function installSandboxFetchMock() {
  const originalFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (url.includes('graph.facebook.com')) {
      const externalId = `sandbox-graph-${Date.now()}`;
      return new Response(JSON.stringify({ id: externalId, post_id: externalId }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return originalFetch(input, init);
  };
}

async function main() {
  const { sandboxMode, workspaceId, platform } = parseArgs();

  if (sandboxMode) {
    installSandboxFetchMock();
    console.log('[T053] SANDBOX mode — Graph API responses mocked (no live OAuth required)');
  }

  const { encryptToken } = await import('../src/lib/crypto/token-vault');
  const { publishDuePosts } = await import('../src/jobs/publish-due-posts');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!supabaseUrl || !serviceKey) {
    console.error('[T053] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  if (!envOk('TOKEN_ENCRYPTION_KEY')) {
    console.error('[T053] Missing TOKEN_ENCRYPTION_KEY (openssl rand -hex 32)');
    process.exit(1);
  }

  process.env.PUBLISHING_ENABLED = 'true';

  const supabase = createClient(supabaseUrl, serviceKey);

  console.log(`[T053] Workspace: ${workspaceId}`);
  console.log(`[T053] Platform: ${platform}`);

  if (sandboxMode) {
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('meta_app_review_status')
      .eq('id', workspaceId)
      .maybeSingle();

    if (workspace?.meta_app_review_status !== 'approved') {
      const { error: gateError } = await supabase
        .from('workspaces')
        .update({ meta_app_review_status: 'approved', updated_at: new Date().toISOString() })
        .eq('id', workspaceId);

      if (gateError) {
        console.error('[T053] Failed to set meta_app_review_status=approved:', gateError.message);
        process.exit(1);
      }
      console.log('[T053] Set meta_app_review_status=approved for sandbox workspace');
    }
  }

  if (platform === 'facebook') {
    const { count } = await supabase
      .from('workspace_social_connections')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('platform', 'facebook')
      .is('disconnected_at', null);

    if (!count || count === 0) {
      let accountId: string;
      let accessToken: string;
      let seededBy: string;

      if (sandboxMode) {
        console.log('[T053] Seeding sandbox facebook connection...');
        accountId = SANDBOX_PAGE_ID;
        accessToken = 'sandbox-access-token-for-uat';
        seededBy = 't053-run-uat.ts --sandbox';
      } else if (!envOk('FACEBOOK_PAGE_ACCESS_TOKEN') || !envOk('FACEBOOK_PAGE_ID')) {
        console.error('[T053] BLOCKED: No facebook connection and no FACEBOOK_PAGE_* env vars.');
        console.error('  Add LinkedIn/X OAuth creds and connect via UI, or set FACEBOOK_PAGE_ID + FACEBOOK_PAGE_ACCESS_TOKEN.');
        console.error('  Or run: npm run uat:t053:sandbox');
        process.exit(2);
      } else {
        console.log('[T053] Seeding facebook connection from env...');
        accountId = process.env.FACEBOOK_PAGE_ID ?? '';
        accessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN ?? '';
        seededBy = 't053-run-uat.ts';
      }

      const encrypted = encryptToken(accessToken);
      await supabase
        .from('workspace_social_connections')
        .update({ disconnected_at: new Date().toISOString() })
        .eq('workspace_id', workspaceId)
        .eq('platform', 'facebook')
        .is('disconnected_at', null);

      const { error: seedError } = await supabase.from('workspace_social_connections').insert({
        workspace_id: workspaceId,
        platform: 'facebook',
        account_id: accountId,
        account_name: 'T053 Sandbox Page',
        access_token_enc: encrypted.ciphertext,
        token_iv: encrypted.iv,
        token_tag: encrypted.tag,
        scopes: ['pages_manage_posts'],
        metadata: { seeded_by: seededBy },
      });

      if (seedError) {
        console.error('[T053] Failed to seed facebook connection:', seedError.message);
        process.exit(1);
      }
    }
  } else {
    const { count } = await supabase
      .from('workspace_social_connections')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('platform', platform)
      .is('disconnected_at', null);

    if (!count || count === 0) {
      console.error(`[T053] BLOCKED: No active ${platform} connection. Connect via Settings OAuth first.`);
      process.exit(2);
    }
  }

  const scheduledAt = new Date(Date.now() - 60_000).toISOString();
  const testMarker = sandboxMode ? `T053-SANDBOX-${Date.now()}` : `T053-UAT-${Date.now()}`;

  const { data: post, error: insertError } = await supabase
    .from('posts')
    .insert({
      workspace_id: workspaceId,
      status: 'scheduled',
      platforms: [platform],
      content: { text: `${testMarker} — Nexus Social T053 publish UAT` },
      scheduled_at: scheduledAt,
    })
    .select('id')
    .single();

  if (insertError || !post) {
    console.error('[T053] Failed to create scheduled post:', insertError?.message);
    process.exit(1);
  }

  console.log(`[T053] Created scheduled post ${post.id}, running publishDuePosts...`);
  const result = await publishDuePosts();
  console.log('[T053] Worker result:', result);

  const { data: updated, error: fetchError } = await supabase
    .from('posts')
    .select('id, status, external_post_id, publish_error')
    .eq('id', post.id)
    .single();

  if (fetchError || !updated) {
    console.error('[T053] Failed to fetch post after publish:', fetchError?.message);
    process.exit(1);
  }

  console.log('[T053] Post after publish:', updated);

  if (updated.status === 'published' && updated.external_post_id) {
    const label = sandboxMode ? 'SANDBOX PASS' : 'PASS';
    console.log(`\n[T053] ${label} — published with external_post_id:`, updated.external_post_id);
    process.exit(0);
  }

  if (updated.status === 'failed') {
    console.error('\n[T053] FAIL — publish_error:', updated.publish_error ?? 'unknown');
    process.exit(1);
  }

  console.error('\n[T053] FAIL — unexpected status:', updated.status);
  process.exit(1);
}

main().catch((err) => {
  console.error('[T053]', err instanceof Error ? err.message : err);
  process.exit(1);
});
