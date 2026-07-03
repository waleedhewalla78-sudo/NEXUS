import { test as setup, expect } from '@playwright/test';
import path from 'node:path';

const authFile = path.join(__dirname, '.auth', 'user.json');

const email = process.env.E2E_USER_EMAIL ?? 'demo@nexussocial.io';
const password = process.env.E2E_USER_PASSWORD ?? 'DemoWalk2026!';

setup('authenticate demo user', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: /^Sign in$/i }).click();

  await expect(page).not.toHaveURL(/\/login/, { timeout: 30_000 });
  await page.context().storageState({ path: authFile });
});
