/**
 * Verify all AI agents respond via Ollama (local integration gate).
 * Usage: npm run verify:ollama-agents
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = join(scriptDir, '..');

function loadEnv() {
  for (const file of ['.env', '.env.local']) {
    const p = join(root, file);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const eq = t.indexOf('=');
      if (eq <= 0) continue;
      const k = t.slice(0, eq).trim();
      const v = t.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
      process.env[k] = v;
    }
  }
}

type Check = { name: string; ok: boolean; detail: string; ms?: number };

async function main() {
  loadEnv();

  const { checkOllamaHealth, isOllamaModelAvailable, matchOllamaModelName } = await import(
    '../src/lib/ai/ollama/ollama-health'
  );
  const {
    isLocalOllamaEnabled,
    isOllamaOnlyMode,
    listOllamaAgentModelConfig,
    resolveOllamaModelForAgent,
  } = await import('../src/lib/ai/ollama/agent-models');
  const { completeViaProviderRouter } = await import('../src/lib/ai/shared-llm');
  const { planCampaignStrategy } = await import('../src/lib/ai-cmo/strategic-brain');
  const { generateCampaignContent } = await import('../src/lib/ai-cmo/creator-agent');
  const { runCopilotChat } = await import('../src/lib/ai/copilot/copilot-service');

  const checks: Check[] = [];

  const push = (name: string, ok: boolean, detail: string, ms?: number) => {
    checks.push({ name, ok, detail, ms });
    const icon = ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
    console.log(`  ${icon} ${name}: ${detail}${ms != null ? ` (${ms}ms)` : ''}`);
  };

  console.log('\n\x1b[36m=== Ollama Agent Verification ===\x1b[0m\n');

  push('USE_LOCAL_OLLAMA', isLocalOllamaEnabled(), isLocalOllamaEnabled() ? 'enabled' : 'set USE_LOCAL_OLLAMA=true');
  push('OLLAMA_ONLY', true, isOllamaOnlyMode() ? 'cloud providers disabled' : 'fallback chain includes Dify/OpenRouter');

  const health = await checkOllamaHealth();
  push('Ollama health', health.ok, health.ok ? `${health.baseUrl} — ${health.models.length} model(s)` : health.error ?? 'down');

  if (!isLocalOllamaEnabled()) {
    console.log('\n\x1b[33mEnable USE_LOCAL_OLLAMA=true in .env.local and re-run.\x1b[0m\n');
    process.exit(1);
  }

  if (!health.ok) {
    console.log('\n\x1b[33mStart Ollama: ollama serve && ollama pull llama3.2\x1b[0m\n');
    process.exit(1);
  }

  console.log('\n  Per-agent models:');
  for (const row of listOllamaAgentModelConfig()) {
    const resolved = matchOllamaModelName(row.model, health.models);
    const available = isOllamaModelAvailable(row.model, health.models);
    push(
      `model:${row.role}`,
      available,
      `${row.model}${resolved && resolved !== row.model ? ` → ${resolved}` : ''}${available ? '' : ' — NOT PULLED'} `,
    );
  }

  const testUserId = 'verify-ollama-user';
  const workspaceId = process.env.NEXT_PUBLIC_DEFAULT_WORKSPACE_ID ?? '11111111-1111-1111-1111-111111111111';

  async function timed<T>(name: string, fn: () => Promise<T>, validate: (r: T) => boolean, detail: (r: T) => string) {
    const start = Date.now();
    try {
      const result = await fn();
      const ms = Date.now() - start;
      push(name, validate(result), detail(result), ms);
    } catch (err) {
      push(name, false, err instanceof Error ? err.message : String(err));
    }
  }

  console.log('\n  LLM smoke tests:\n');

  await timed(
    'strategic_brain',
    () =>
      planCampaignStrategy({
        objective: 'Verify Ollama integration — summer promo',
        userId: testUserId,
        workspaceId,
        locale: 'en-US',
      }),
    (p) => Boolean(p.channels?.length && p.keyMessages?.length),
    (p) => `channels=${p.channels.join(',')}`,
  );

  await timed(
    'creator',
    async () => {
      const plan = await planCampaignStrategy({
        objective: 'Verify creator agent',
        userId: testUserId,
        workspaceId,
      });
      return generateCampaignContent({ plan, userId: testUserId, workspaceId });
    },
    (c) => c.caption.length > 10,
    (c) => `caption=${c.caption.slice(0, 60)}…`,
  );

  await timed(
    'quality_judge',
    () =>
      completeViaProviderRouter({
        systemPrompt: 'Return JSON: {"accuracy":0.9,"brandAlignment":0.9,"localization":0.9,"uniqueness":0.9,"eeat":0.9,"engagement":0.9,"platformCompliance":0.9,"safety":0.9,"hallucinationFlag":false,"feedback":"ok"}',
        userPrompt: 'Score this caption: Hello world launch post',
        userId: testUserId,
        agentRole: 'quality_judge',
      }),
    (r) => !r.stubbed && (r.text.includes('accuracy') || r.provider === 'ollama'),
    (r) => `${r.provider}/${r.modelUsed}`,
  );

  for (const role of ['inbox', 'caption', 'copilot', 'radar', 'optimizer'] as const) {
    await timed(
      role,
      () =>
        completeViaProviderRouter({
          systemPrompt: 'Reply in one short sentence.',
          userPrompt: `Ping test for ${role} agent`,
          userId: testUserId,
          agentRole: role,
        }),
      (r) => !r.stubbed && r.text.length > 0,
      (r) => `${r.provider}/${resolveOllamaModelForAgent(role)}`,
    );
  }

  await timed(
    'copilot_orchestrator',
    () =>
      runCopilotChat({
        workspaceId,
        userId: testUserId,
        message: 'agent status',
      }),
    (r) => r.reply.includes('Ollama'),
    (r) => `${r.intent} · ${r.provider}`,
  );

  const failed = checks.filter((c) => !c.ok);
  console.log(`\n--- ${checks.length - failed.length}/${checks.length} passed ---\n`);
  process.exit(failed.length ? 1 : 0);
}

main();
