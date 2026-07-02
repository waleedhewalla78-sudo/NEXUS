/**
 * Verify Dify API credentials from .env.local
 * Usage: npm run ai:verify
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const rootDir = join(scriptDir, '..');

function clearStalePlaceholderEnv() {
  for (const key of ['DIFY_API_KEY', 'DIFY_BASE_URL', 'NEXT_PUBLIC_SUPABASE_URL']) {
    const value = process.env[key];
    if (value && /placeholder|preflight|localhost:3002/i.test(value)) {
      delete process.env[key];
    }
  }
}

function loadEnvFile(relativePath: string, override: boolean) {
  const full = join(rootDir, relativePath);
  if (!existsSync(full)) return;
  for (const line of readFileSync(full, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (override || process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

clearStalePlaceholderEnv();
loadEnvFile('.env', false);
loadEnvFile('.env.local', true);

async function main() {
  const base = (process.env.DIFY_BASE_URL ?? '').replace(/\/$/, '');
  const apiKey = process.env.DIFY_API_KEY ?? '';

  if (!base || !apiKey) {
    console.error('[ai:verify] Set DIFY_BASE_URL and DIFY_API_KEY in .env.local');
    console.error('[ai:verify] Example: DIFY_BASE_URL=https://api.dify.ai');
    console.error('[ai:verify]          DIFY_API_KEY=app-xxxxxxxx');
    process.exitCode = 1;
    return;
  }

  console.log(`[ai:verify] Testing ${base} ...`);

  const res = await fetch(`${base}/v1/chat-messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: {},
      query: 'Reply with exactly: Nexus AI verify OK',
      response_mode: 'blocking',
      user: 'nexus-verify-script',
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    if (res.status === 401 || res.status === 403) {
      console.error('[ai:verify] Invalid API key:', res.status, txt);
    } else if (txt.includes('Workflow not published') || txt.includes('not published')) {
      console.error('[ai:verify] API key is valid, but the Dify app/workflow is not published.');
      console.error('[ai:verify] In Dify Cloud: Studio → your app → Publish (top right) → confirm.');
      console.error('[ai:verify] Ensure the API key (app-...) matches that published app under API Access.');
      process.exitCode = 2;
      return;
    } else {
      console.error('[ai:verify] Failed:', res.status, txt);
    }
    process.exitCode = 1;
    return;
  }

  const json = (await res.json()) as { answer?: string };
  console.log('[ai:verify] Dify OK');
  if (json.answer) console.log('[ai:verify] Answer:', json.answer.slice(0, 200));
  console.log('[ai:verify] Run npm run ai:setup then test at /settings/ai-agent');
}

main().catch((err) => {
  console.error('[ai:verify] Failed:', err);
  process.exitCode = 1;
});
