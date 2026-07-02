import { defineConfig } from 'cypress';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

function loadEnvLocal(): Record<string, string> {
  const path = join(__dirname, '.env.local');
  const env: Record<string, string> = {};
  if (!existsSync(path)) return env;

  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    env[key] = value;
  }
  return env;
}

const envLocal = loadEnvLocal();

export default defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || 'http://localhost:3005',
    supportFile: 'cypress/support/e2e.ts',
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 20_000,
    setupNodeEvents() {},
  },
  env: {
    TEST_EMAIL:
      process.env.CYPRESS_TEST_EMAIL ||
      envLocal.CYPRESS_TEST_EMAIL ||
      envLocal.TEST_USER_EMAIL ||
      '',
    TEST_PASSWORD:
      process.env.CYPRESS_TEST_PASSWORD ||
      envLocal.CYPRESS_TEST_PASSWORD ||
      envLocal.TEST_USER_PASSWORD ||
      '',
    META_APP_SECRET: envLocal.META_APP_SECRET || 'test_secret',
    MOCK_READ_ONLY_API_KEY: envLocal.MOCK_READ_ONLY_API_KEY || 'mock_read_key',
  },
});
