import { test, expect } from '@playwright/test';

test.describe('Smoke tests', () => {
  test('health API returns ok', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.status).toBe('ok');
    expect(json.details.db).toBe('up');
    // Redis/Chatwoot/Dify are optional in local dev
  });

  test('login page renders', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /Sign in to Nexus Social/i })).toBeVisible();
  });

  test('setup page renders', async ({ page }) => {
    await page.goto('/setup');
    await expect(page.getByRole('heading', { name: /Nexus Social — Database Setup/i })).toBeVisible();
  });

  test('unauthenticated users redirect to login', async ({ page }) => {
    await page.goto('/calendar');
    await expect(page).toHaveURL(/\/login/);
  });
});
