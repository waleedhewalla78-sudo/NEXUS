import { supabaseAdmin } from '@/lib/supabase/server';
import { enqueueWebhookDelivery } from '@/lib/webhooks/delivery';

/**
 * Dispatches an event to all registered outbound webhooks for a workspace.
 */
export async function dispatchWebhookEvent(workspaceId: string, event: string, payload: unknown) {
  const { data: subscriptions } = await supabaseAdmin
    .from('webhook_subscriptions')
    .select('url, secret, events')
    .eq('workspace_id', workspaceId);

  if (!subscriptions || subscriptions.length === 0) return;

  const activeWebhooks = subscriptions.filter((sub) => sub.events.includes(event) || sub.events.includes('*'));

  if (activeWebhooks.length === 0) return;

  const eventPayload = {
    event,
    workspace_id: workspaceId,
    timestamp: new Date().toISOString(),
    data: payload,
  };

  const payloadString = JSON.stringify(eventPayload);

  await Promise.all(
    activeWebhooks.map((webhook) =>
      enqueueWebhookDelivery({
        url: webhook.url,
        secret: webhook.secret,
        payloadString,
      })
    )
  );
}
