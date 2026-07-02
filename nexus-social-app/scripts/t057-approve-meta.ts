/**
 * T057 — Set meta_app_review_status=approved for a workspace (after Meta App Review).
 * Usage: npx ts-node scripts/t057-approve-meta.ts <workspace-uuid>
 *        npm run uat:meta-approve -- 87737e18-8882-4eea-a647-6c3eaa08cd25
 */
import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));

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

async function main() {
  const workspaceId = process.argv[2];
  if (!workspaceId) {
    console.error('Usage: npx ts-node scripts/t057-approve-meta.ts <workspace-uuid>');
    console.error('  Whewalla: 87737e18-8882-4eea-a647-6c3eaa08cd25');
    process.exit(1);
  }

  const force = process.argv.includes('--force');
  if (!force) {
    console.warn('[T057] Only run after Meta App Review is approved in Meta Developer Console.');
    console.warn('[T057] Pass --force to skip this warning.');
    process.exit(2);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!url || !key) {
    console.error('[T057] Missing Supabase env');
    process.exit(1);
  }

  const supabase = createClient(url, key);
  const { data, error } = await supabase
    .from('workspaces')
    .update({ meta_app_review_status: 'approved', updated_at: new Date().toISOString() })
    .eq('id', workspaceId)
    .select('id, name, meta_app_review_status')
    .single();

  if (error) {
    console.error('[T057] UPDATE failed:', error.message);
    process.exit(1);
  }

  console.log('[T057] PASS — Meta publish gate enabled:', data);
  console.log('[T057] Run NOTIFY pgrst in SQL Editor if PostgREST cache stale.');
}

main().catch((err) => {
  console.error('[T057]', err);
  process.exit(1);
});
