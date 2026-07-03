import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

const authFile = path.join(__dirname, 'e2e', '.auth', 'user.json');

export default defineConfig({
  testDir: './e2e',
  timeout: 180_000,
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1,
  reporter: 'html',
  use: {
    baseURL: process.env.NEXT_PUBLIC_APP_URL || 'http://127.0.0.1:3005',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev',
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://127.0.0.1:3005',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'chromium',
      testIgnore: [/auth\.setup\.ts/, /authenticated\.spec\.ts/],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium-authenticated',
      testMatch: /authenticated\.spec\.ts/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: authFile,
      },
    },
  ],
});
