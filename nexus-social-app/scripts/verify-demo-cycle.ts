/**
 * Verify demo data exists across all product components (Cycle 0 gate).
 * Usage: npm run demo:verify-cycle
 */
import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const WALKTHROUGH_WORKSPACE_ID = '11111111-1111-1111-1111-111111111111';
const DEMO_EMAIL = 'demo@nexussocial.io';

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

type Check = { name: string; ok: boolean; detail: string };

async function main() {
  const dataOnly = process.argv.includes('--data-only');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3005';

  if (!url || !key) {
    console.error('[demo-cycle] Missing Supabase env');
    process.exit(1);
  }

  const supabase = createClient(url, key);
  const checks: Check[] = [];

  const push = (name: string, ok: boolean, detail: string) => checks.push({ name, ok, detail });

  try {
    const { data: ws } = await supabase
      .from('workspaces')
      .select('name, meta_app_review_status')
      .eq('id', WALKTHROUGH_WORKSPACE_ID)
      .single();
    push(
      'Workspace',
      Boolean(ws?.name),
      ws ? `${ws.name} (meta=${ws.meta_app_review_status ?? 'null'})` : 'missing',
    );
  } catch {
    push('Workspace', false, 'query failed');
  }

  const { data: authUsers } = await supabase.auth.admin.listUsers({ page: 1, perPage: 100 });
  const demoUser = authUsers?.users.find((u) => u.email?.toLowerCase() === DEMO_EMAIL);
  push('Demo auth user', Boolean(demoUser?.id), demoUser?.id ?? 'demo@nexussocial.io not found');

  const tables: Array<{ name: string; table: string; min: number }> = [
    { name: 'Posts', table: 'posts', min: 3 },
    { name: 'AI agent config', table: 'ai_agent_configs', min: 1 },
    { name: 'Chatwoot inbox map', table: 'chatwoot_inbox_workspace_map', min: 1 },
    { name: 'AI credit ledger', table: 'ai_credit_ledger', min: 1 },
    { name: 'Automation flows', table: 'automation_flows', min: 1 },
    { name: 'Listening queries', table: 'listening_queries', min: 1 },
    { name: 'Mentions', table: 'mentions', min: 1 },
    { name: 'External reviews', table: 'external_reviews', min: 1 },
    { name: 'Post analytics', table: 'post_analytics', min: 1 },
    { name: 'Social connections', table: 'workspace_social_connections', min: 1 },
    { name: 'User notifications', table: 'user_notifications', min: 1 },
    { name: 'Custom reports', table: 'custom_reports', min: 1 },
  ];

  for (const { name, table, min } of tables) {
    try {
      let count = 0;
      if (table === 'mentions') {
        const { count: n, error } = await supabase.from(table).select('id', { count: 'exact', head: true });
        if (error) throw new Error(error.message);
        count = n ?? 0;
      } else {
        const pk =
          table === 'chatwoot_inbox_workspace_map'
            ? 'chatwoot_inbox_id'
            : table === 'ai_credit_ledger' || table === 'ai_agent_configs'
              ? 'workspace_id'
              : 'id';
        const { count: n, error } = await supabase
          .from(table)
          .select(pk, { count: 'exact', head: true })
          .eq('workspace_id', WALKTHROUGH_WORKSPACE_ID);
        if (error) throw new Error(error.message);
        count = n ?? 0;
      }
      push(name, count >= min, count >= min ? `${count} row(s)` : `found ${count}, need ${min}`);
    } catch (err) {
      push(name, false, err instanceof Error ? err.message : String(err));
    }
  }

  try {
    if (!dataOnly) {
      const health = await fetch(`${appUrl}/api/health`, { signal: AbortSignal.timeout(30_000) });
      const json = (await health.json()) as { status?: string; details?: { db?: string } };
      push('Health API', health.ok && json.status === 'ok', `db=${json.details?.db ?? 'unknown'}`);
    }
  } catch (err) {
    if (!dataOnly) {
      push('Health API', false, err instanceof Error ? err.message : 'unreachable');
    }
  }

  console.log('=== Demo cycle component check ===\n');
  let failed = 0;
  for (const c of checks) {
    const mark = c.ok ? 'PASS' : 'FAIL';
    console.log(`  [${mark}] ${c.name}: ${c.detail}`);
    if (!c.ok) failed += 1;
  }

  console.log(`\n=== ${checks.length - failed}/${checks.length} components ready ===`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('[demo-cycle]', err);
  process.exit(1);
});
