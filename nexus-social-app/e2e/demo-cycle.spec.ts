import { test, expect } from '@playwright/test';

/**
 * Deep demo cycle — verifies all major product surfaces load (auth-gated routes redirect correctly).
 * Login manually as demo@nexussocial.io / DemoWalk2026! for full UI walkthrough.
 */
test.describe('Demo cycle — product surfaces', () => {
  test('Cycle 1: Platform health', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.status).toBe('ok');
    expect(json.details.db).toBe('up');
  });

  test('Cycle 2: Auth & onboarding entry points', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /Sign in to Nexus Social/i })).toBeVisible();

    await page.goto('/setup');
    await expect(page.getByRole('heading', { name: 'Nexus Social — Database Setup' })).toBeVisible();
  });

  test('Cycle 3: Content engine routes (auth gate)', async ({ page }) => {
    for (const path of ['/calendar', '/posts/create']) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login/);
    }
  });

  test('Cycle 4: Inbox, analytics, automations (auth gate)', async ({ page }) => {
    for (const path of ['/inbox', '/analytics', '/automations/builder', '/reputation']) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login/);
    }
  });

  test('Cycle 5: Settings & reports (auth gate)', async ({ page }) => {
    for (const path of ['/settings', '/settings/ai-agent', '/reports/builder']) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login/);
    }
  });

  test('Cycle 6: AI tool proxy auth', async ({ request }) => {
    const res = await request.post('/api/tools/get-workspace-analytics', {
      data: { workspace_id: '11111111-1111-1111-1111-111111111111' },
    });
    expect(res.status()).toBe(401);
  });

  test('Cycle 7: Chatwoot AI webhook fixture', async ({ request }) => {
    const res = await request.post('/api/webhooks/chatwoot-ai', {
      headers: { 'x-e2e-test': 'true' },
      data: {
        event: 'message_created',
        message: { message_type: 0, content: 'Demo cycle webhook', sender: { id: 999 } },
        conversation: { id: 9001, inbox_id: 1 },
      },
    });
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    const ok =
      json.reason === 'global_kill_switch_active' ||
      json.status === 'enqueued' ||
      json.status === 'ignored';
    expect(ok).toBeTruthy();
  });
});
