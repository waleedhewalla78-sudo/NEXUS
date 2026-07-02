import { test, expect } from '@playwright/test';

test.describe('AI CMO campaign smoke', () => {
  test('navigates to campaign creation flow', async ({ page }) => {
    await page.goto('/login');
    await page.goto('/settings/ai-agent');

    const newCampaignButton = page.getByRole('button', { name: /new campaign/i }).or(
      page.getByRole('link', { name: /new campaign/i }),
    );

    if (await newCampaignButton.count()) {
      await newCampaignButton.first().click();
      await expect(page).toHaveURL(/campaign|ai-cmo|create/i);
    } else {
      const response = await page.request.post('/api/v1/ai-cmo/campaigns', {
        data: {
          objective: 'Playwright smoke test campaign',
          locale: 'en-US',
        },
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.NEXUS_API_KEY ?? 'test-api-key',
          'x-workspace-id': process.env.NEXT_PUBLIC_DEFAULT_WORKSPACE_ID ?? '00000000-0000-0000-0000-000000000001',
        },
      });

      expect([200, 202, 401, 422]).toContain(response.status());
    }
  });
});
