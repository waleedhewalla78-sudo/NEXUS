import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

function loadEnvFile(relativePath: string, override: boolean) {
  const full = join(process.cwd(), relativePath);
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

loadEnvFile('.env', false);
loadEnvFile('.env.local', true);

// Node 20 workers: apply WebSocket polyfill before any Supabase client module loads.
if (typeof window === 'undefined') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('./supabase/node-websocket-polyfill').applyNodeWebSocketPolyfill();
  } catch {
    // Optional — server.ts also passes ws transport explicitly.
  }
}
