import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function loadEnv() {
  for (const file of ['.env', '.env.local']) {
    const p = join(root, file);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const eq = t.indexOf('=');
      if (eq <= 0) continue;
      process.env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
    }
  }
}

async function main() {
  loadEnv();
  const { completeViaProviderRouter } = await import('../src/lib/ai/shared-llm');

  const start = Date.now();
  const r = await completeViaProviderRouter({
    systemPrompt:
      'Return JSON: {"accuracy":0.9,"brandAlignment":0.9,"localization":0.9,"uniqueness":0.9,"eeat":0.9,"engagement":0.9,"platformCompliance":0.9,"safety":0.9,"hallucinationFlag":false,"feedback":"ok"}',
    userPrompt: 'Score this caption: Hello world launch post',
    userId: 'verify-ollama-user',
    agentRole: 'quality_judge',
  });

  const ms = Date.now() - start;
  const ok = !r.stubbed && r.text.includes('accuracy');
  console.log(ok ? 'PASS' : 'FAIL', `${r.provider}/${r.modelUsed}`, `${ms}ms`);
  process.exit(ok ? 0 : 1);
}

main();
