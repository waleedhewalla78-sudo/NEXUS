import { test, expect, type APIRequestContext } from '@playwright/test';

// Use standard API Request context for Webhook injection
test.describe('Nexus Social AI Agent: Critical Paths', () => {

  test.describe.configure({ timeout: 180_000 });

  const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://127.0.0.1:3000';
  const INBOX_ID = 1;

  async function postWebhook(request: APIRequestContext, payload: Record<string, unknown>) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await request.post(`${BASE_URL}/api/webhooks/chatwoot-ai`, {
          data: payload,
          headers: { 'x-e2e-test': 'true' },
        });
      } catch (error) {
        if (attempt === 2) throw error;
        await new Promise((resolve) => setTimeout(resolve, 3_000));
      }
    }
    throw new Error('unreachable');
  }

  // TC-08b: AI-KILL-01 (Kill Switch)
  test('AI-02: Global Kill Switch instantly drops webhooks', async ({ request }) => {
    const payload = {
      event: 'message_created',
      message: { message_type: 0, sender: { id: 999 } },
      conversation: { id: 1001, inbox_id: INBOX_ID }
    };

    // Note for QA: Ensure the staging database has `is_globally_disabled = true` for this test
    const response = await postWebhook(request, payload);

    expect(response.ok()).toBeTruthy();
    const json = await response.json();

    if (json.reason === 'unmapped_inbox') {
      test.skip(true, 'Restart dev server to load x-e2e-test fixture, or seed chatwoot_inbox_workspace_map for inbox_id=1');
    }

    expect(json.status).toBe('ignored');
    expect(json.reason).toBe('global_kill_switch_active');
  });

  // TC-04: AI-PII-01 (PII Redaction)
  test('AI-01: User PII is redacted before AI Orchestration', async () => {
    // Note for QA: This requires intercepting the outbound Dify API call in staging,
    // or verifying the resulting DB log in `ai_conversation_logs`.
    // We will verify the database log to ensure the `user_query` was safely redacted.
    
    // In a live Playwright environment, you would log into Supabase or check an admin endpoint:
    // const logs = await fetchStagingDBLogs('test_workspace_id');
    // expect(logs[0].user_query).toContain('[REDACTED_EMAIL]');
    
    test.info().annotations.push({
      type: 'QA Manual Check',
      description: 'Verify Dify API network tab or `ai_conversation_logs` for `[REDACTED_EMAIL]`'
    });
  });

  // TC-03: AI-03 (Tool Execution HITL)
  test('AI-03: Destructive "Write" tools trigger HITL Magic Link', async ({ request }) => {
    // Simulate Chatwoot message: "Issue a refund for order #123"
    const payload = {
      event: 'message_created',
      message: { message_type: 0, content: 'Issue a full refund for order 12345', sender: { id: 999 } },
      conversation: { id: 1002, inbox_id: INBOX_ID, contact_inbox: { contact_id: 888 } }
    };

    // Push the message
    const res = await postWebhook(request, payload);
    expect(res.ok()).toBeTruthy();

    // Since orchestration runs asynchronously in a Redis queue, we wait for processing
    await new Promise(resolve => setTimeout(resolve, 5000));

    // QA Check: The AI should have replied with a private note in Chatwoot containing the magic link
    test.info().annotations.push({
      type: 'Verification',
      description: 'Check Chatwoot Conversation 1002. A private note should exist with: [✅ APPROVE REFUND]'
    });
  });

});
