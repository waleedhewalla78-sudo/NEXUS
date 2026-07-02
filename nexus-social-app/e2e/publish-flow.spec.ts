import { test, expect } from '@playwright/test';

/**
 * T024 — Publish path E2E (automated subset).
 * Validates health, auth gates, OAuth error redirect shape, and settings OAuth params.
 * Live OAuth → schedule → worker → published requires operator credentials (T053).
 */
test.describe('Publish flow E2E (T024 automated)', () => {
  test('health endpoint ready for publish worker monitoring', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.status()).toBeLessThan(600);

    const json = await res.json();
    expect(json.details).toBeTruthy();
    expect(json.details.db).toBe('up');
  });

  test('settings requires auth before OAuth error params are shown', async ({ page }) => {
    await page.goto('/settings?oauth=error&platform=linkedin&message=access_denied');
    await expect(page).toHaveURL(/\/login/);
    await expect(page).toHaveURL(/redirect=%2Fsettings/);
  });

  test('calendar requires authentication before scheduling', async ({ page }) => {
    await page.goto('/calendar');
    await expect(page).toHaveURL(/\/login/);
  });

  test('posts create requires authentication', async ({ page }) => {
    await page.goto('/posts/create');
    await expect(page).toHaveURL(/\/login/);
  });

  test('analytics tool enforces internal auth', async ({ request }) => {
    const res = await request.post('/api/tools/get-workspace-analytics', {
      data: { workspace_id: '123e4567-e89b-12d3-a456-426614174000' },
    });
    expect(res.status()).toBe(401);
  });
});
