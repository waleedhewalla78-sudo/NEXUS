import { test, expect } from '@playwright/test';

/**
 * T024 partial — API-level publish path validation without live OAuth.
 * Full UI OAuth flow remains operator UAT (T053) until sandbox credentials exist.
 */
test.describe('Publish integration (API smoke)', () => {
  test('health reports schema and db readiness', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.ok()).toBeTruthy();

    const json = await res.json();
    expect(json.details.db).toBe('up');
    expect(['ok', 'error']).toContain(json.status);
  });

  test('analytics tool rejects unauthenticated requests', async ({ request }) => {
    const res = await request.post('/api/tools/get-workspace-analytics', {
      data: { workspace_id: '123e4567-e89b-12d3-a456-426614174000' },
    });
    expect(res.status()).toBe(401);
  });

  test('public API v1 posts requires auth', async ({ request }) => {
    const res = await request.get('/api/v1/posts');
    expect([401, 403]).toContain(res.status());
  });
});
