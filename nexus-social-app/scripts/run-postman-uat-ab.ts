/**
 * Automated Postman UAT Tests A and B (curl-equivalent).
 * Requires running stack: dev + worker + Inngest + Redis + Ollama.
 *
 * Usage:
 *   npm run uat:postman-ab
 *   NEXUS_API_KEY=nsk_live_... npx tsx scripts/run-postman-uat-ab.ts
 */
import { createHash } from 'node:crypto';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { buildUniqueUatObjective } from './uat-objective';
import { runUatPreflight } from './uat-preflight';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = join(scriptDir, '..');
const POLL_MS = 10_000;
const POLL_MAX_MS = Number.parseInt(process.env.LIVE_TEST_POLL_TIMEOUT_MS ?? '1200000', 10);
const SIGNOFF_FILE = join(root, 'docs', 'UAT-SIGNOFF-RESULTS.md');

type Check = { name: string; ok: boolean; detail: string };

function loadEnv() {
  for (const file of ['.env', '.env.local', '.uat-secrets.local']) {
    const p = join(root, file);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const eq = t.indexOf('=');
      if (eq <= 0) continue;
      const k = t.slice(0, eq).trim();
      const v = t.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
      if (!process.env[k]) process.env[k] = v;
    }
  }
}

function baseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXTAUTH_URL ??
    `http://localhost:${process.env.DEV_PORT ?? '3005'}`
  ).replace(/\/$/, '');
}

async function resolveWorkspace(supabase: SupabaseClient, apiKey: string): Promise<string> {
  const hash = createHash('sha256').update(apiKey.trim()).digest('hex');
  const { data, error } = await supabase.from('api_keys').select('workspace_id').eq('key_hash', hash).maybeSingle();
  if (error || !data?.workspace_id) throw new Error('Invalid API key');
  return String(data.workspace_id);
}

async function resolveBrandId(supabase: SupabaseClient, workspaceId: string): Promise<string | undefined> {
  const { data } = await supabase.from('brands').select('id').eq('workspace_id', workspaceId).limit(1).maybeSingle();
  return data?.id ? String(data.id) : undefined;
}

async function postCampaign(apiKey: string, objective: string, brandId?: string) {
  const res = await fetch(`${baseUrl()}/api/v1/ai-cmo/campaigns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify({
      objective,
      brandId: brandId ?? null,
      brandName: 'Postman UAT Brand',
      locale: 'en-US',
      persona: 'operator',
    }),
  });
  const body = await parseJsonResponse<{ jobId?: string; error?: string; status?: string }>(res);
  return { status: res.status, body };
}

async function parseJsonResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text.trim()) {
    throw new Error(`Empty response body (HTTP ${res.status})`);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Invalid JSON (HTTP ${res.status}): ${text.slice(0, 120)}`);
  }
}

async function pollJob(
  apiKey: string,
  jobId: string,
  expect: 'completed' | 'failed',
  maxMs = POLL_MAX_MS,
) {
  const deadline = Date.now() + maxMs;
  let emptyRetries = 0;
  while (Date.now() < deadline) {
    const res = await fetch(`${baseUrl()}/api/v1/ai-cmo/campaigns/jobs/${jobId}`, {
      headers: { 'x-api-key': apiKey },
    });

    let job: {
      status: string;
      error?: string;
      result?: { status?: string; reason?: string };
    };

    try {
      job = await parseJsonResponse(res);
    } catch (parseErr) {
      emptyRetries += 1;
      if (emptyRetries <= 5 && (!res.ok || res.status >= 500)) {
        await new Promise((r) => setTimeout(r, POLL_MS));
        continue;
      }
      throw parseErr;
    }

    if (job.status === expect) return job;
    if (expect === 'completed' && job.status === 'failed') {
      throw new Error(job.error ?? 'Workflow failed');
    }
    if (expect === 'failed' && job.status === 'completed') {
      throw new Error('Expected budget block but job completed');
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
  throw new Error(`Poll timed out waiting for ${expect}`);
}

async function setupBudgetBlock(supabase: SupabaseClient, workspaceId: string) {
  const { data: existing } = await supabase
    .from('ai_cmo_budget_policies')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('scope', 'workspace')
    .eq('period', 'monthly')
    .maybeSingle();

  if (existing?.id) {
    await supabase
      .from('ai_cmo_budget_policies')
      .update({ cap_usd: 0.01, action_on_cap: 'block' })
      .eq('id', existing.id);
  } else {
    await supabase.from('ai_cmo_budget_policies').insert({
      workspace_id: workspaceId,
      scope: 'workspace',
      period: 'monthly',
      cap_usd: 0.01,
      action_on_cap: 'block',
    });
  }

  await supabase.from('ai_cmo_cost_ledger').insert({
    workspace_id: workspaceId,
    agent_name: 'uat-budget-block-seed',
    cost_category: 'tokens',
    amount_usd: 1.0,
    recorded_at: new Date().toISOString(),
  });
}

async function cleanupBudgetBlock(supabase: SupabaseClient, workspaceId: string) {
  await supabase
    .from('ai_cmo_budget_policies')
    .update({ cap_usd: 100.0 })
    .eq('workspace_id', workspaceId)
    .eq('scope', 'workspace')
    .eq('period', 'monthly');
  await supabase
    .from('ai_cmo_cost_ledger')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('agent_name', 'uat-budget-block-seed');
}

async function countRecentContent(supabase: SupabaseClient, workspaceId: string): Promise<number> {
  const since = new Date(Date.now() - 120_000).toISOString();
  const { count } = await supabase
    .from('ai_cmo_content_pieces')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .gte('created_at', since);
  return count ?? 0;
}

function writeSignoff(checks: Check[], testA: boolean, testB: boolean) {
  const now = new Date().toISOString().slice(0, 10);
  const lines = [
    '# UAT Sign-Off Results (auto-generated)',
    '',
    `**Last run:** ${new Date().toISOString()}`,
    '',
    '## Postman Test A (Happy Path)',
    '',
    `| Status | ${testA ? 'PASS' : 'FAIL'} |`,
    '',
    '## Postman Test B (Budget Block)',
    '',
    `| Status | ${testB ? 'PASS' : 'FAIL'} |`,
    '',
    '## Detail',
    '',
    ...checks.map((c) => `- [${c.ok ? 'x' : ' '}] ${c.name}: ${c.detail}`),
    '',
    '## Executive Sign-Off (fill names after review)',
    '',
    '| Checkpoint | Verified By | Date |',
    '|------------|-------------|------|',
    `| Postman Test A | ${testA ? 'Automated gate' : ''} | ${testA ? now : ''} |`,
    `| Postman Test B | ${testB ? 'Automated gate' : ''} | ${testB ? now : ''} |`,
    '',
  ];
  writeFileSync(SIGNOFF_FILE, lines.join('\n'), 'utf8');
  console.log(`\nSign-off draft written: docs/UAT-SIGNOFF-RESULTS.md`);
}

async function main() {
  loadEnv();
  const checks: Check[] = [];
  const push = (name: string, ok: boolean, detail: string) => {
    checks.push({ name, ok, detail });
    console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: ${detail}`);
  };

  const apiKey = process.env.NEXUS_API_KEY?.trim();
  if (!apiKey) {
    console.error('Set NEXUS_API_KEY or run: npx tsx scripts/ensure-uat-api-key.ts');
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
  const workspaceId = await resolveWorkspace(supabase, apiKey);
  const brandId = await resolveBrandId(supabase, workspaceId);

  process.env.UAT_DEMO_WORKSPACE_ID = workspaceId;
  process.env.UAT_RELAX_QUALITY_GATE = 'true';

  const preflight = await runUatPreflight(supabase, workspaceId);
  if (preflight.contentDeleted > 0 || preflight.qdrantCleared.length > 0) {
    console.log(
      `UAT preflight: cleared ${preflight.contentDeleted} content piece(s); Qdrant: ${preflight.qdrantCleared.join(', ') || 'none'}`,
    );
  }

  // Test B first — finops-preflight fails fast; avoids queue behind long Test A Ollama run.
  console.log('\n=== Postman UAT Test B (Budget Block) ===\n');
  let testB = false;
  const contentBefore = await countRecentContent(supabase, workspaceId);
  try {
    await setupBudgetBlock(supabase, workspaceId);
    const post = await postCampaign(apiKey, 'Budget block UAT test campaign', brandId);
    push('Test B POST 202', post.status === 202, `HTTP ${post.status}`);
    if (post.status !== 202 || !post.body.jobId) throw new Error('Missing jobId');

    const job = await pollJob(apiKey, post.body.jobId, 'failed', 120_000);
    const budgetMsg = job.error ?? job.result?.reason ?? '';
    push(
      'Test B budget message',
      /budget cap|exceeded|fail-closed/i.test(budgetMsg),
      budgetMsg.slice(0, 120),
    );

    const contentAfter = await countRecentContent(supabase, workspaceId);
    push('Test B no new content', contentAfter === contentBefore, `delta=${contentAfter - contentBefore}`);
    testB = checks.filter((c) => c.name.startsWith('Test B')).every((c) => c.ok);
  } catch (err) {
    push('Test B', false, err instanceof Error ? err.message : String(err));
  } finally {
    await cleanupBudgetBlock(supabase, workspaceId);
  }

  console.log('\n=== Postman UAT Test A (Happy Path) ===\n');
  let testA = false;
  try {
    const post = await postCampaign(apiKey, buildUniqueUatObjective(), brandId);
    push('Test A POST 202', post.status === 202, `HTTP ${post.status}`);
    if (post.status !== 202 || !post.body.jobId) throw new Error('Missing jobId');

    const job = await pollJob(apiKey, post.body.jobId, 'completed');
    push('Test A poll completed', true, `result.status=${job.result?.status ?? 'n/a'}`);

    const { count: campaigns } = await supabase
      .from('ai_cmo_campaigns')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId);
    push('Test A campaigns row', (campaigns ?? 0) > 0, `count=${campaigns ?? 0}`);

    const { count: costs } = await supabase
      .from('ai_cmo_cost_ledger')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId);
    push('Test A cost ledger', (costs ?? 0) > 0, `entries=${costs ?? 0}`);
    testA = checks.filter((c) => c.name.startsWith('Test A')).every((c) => c.ok);
  } catch (err) {
    push('Test A', false, err instanceof Error ? err.message : String(err));
  }

  writeSignoff(checks, testA, testB);
  const allOk = testA && testB;
  console.log(`\n--- Postman UAT: ${allOk ? 'ALL PASS' : 'FAILED'} ---\n`);
  process.exit(allOk ? 0 : 1);
}

main();
