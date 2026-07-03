export default async function globalSetup() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://127.0.0.1:3005';
  const payload = {
    event: 'message_created',
    message: { message_type: 0, sender: { id: 999 } },
    conversation: { id: 1001, inbox_id: 1 },
  };

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const res = await fetch(`${baseUrl}/api/webhooks/chatwoot-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-e2e-test': 'true' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(180_000),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.reason === 'global_kill_switch_active') {
          return;
        }
      }
    } catch {
      // Retry after cold compile / dev server startup.
    }
    await new Promise((resolve) => setTimeout(resolve, 5_000));
  }
}