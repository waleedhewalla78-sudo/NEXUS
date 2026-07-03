import { test, expect } from '@playwright/test';

/**
 * Authenticated UI regression — requires e2e/auth.setup.ts storage state.
 * Skips when demo user is not seeded (Supabase auth).
 */
test.describe('Authenticated product surfaces', () => {
  test('settings hub loads when authenticated', async ({ page }) => {
    await page.goto('/settings');
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: /settings|workspace|integrations/i }).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test('AI CMO nav routes are reachable', async ({ page }) => {
    for (const path of ['/ai-cmo/campaigns/new', '/ai-cmo/intelligence', '/ai-cmo/control-plane']) {
      await page.goto(path);
      await expect(page).not.toHaveURL(/\/login/);
    }
  });

  test('calendar and posts create load when authenticated', async ({ page }) => {
    await page.goto('/calendar');
    await expect(page).not.toHaveURL(/\/login/);

    await page.goto('/posts/create');
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('ABM dashboard API reachable from session context', async ({ page, request }) => {
    await page.goto('/settings');
    await expect(page).not.toHaveURL(/\/login/);

    const res = await request.get('/api/v1/ai-cmo/abm/accounts', {
      headers: {
        'x-api-key': process.env.NEXUS_API_KEY ?? '',
        'x-workspace-id': process.env.NEXT_PUBLIC_DEFAULT_WORKSPACE_ID ?? '',
      },
    });

    if (process.env.NEXUS_API_KEY) {
      expect(res.status()).toBeLessThan(500);
    } else {
      expect([401, 403, 200]).toContain(res.status());
    }
  });
});
