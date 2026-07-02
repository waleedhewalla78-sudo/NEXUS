import { supabaseAdmin } from '@/lib/supabase/server';

/**
 * Evaluates and executes an automation flow, forwarding matches to Activepieces when configured.
 */
export async function executeAutomationJob({
  workspaceId,
  platform,
  eventType,
  payload,
}: {
  workspaceId: string;
  platform: 'instagram' | 'facebook';
  eventType: 'comment' | 'dm';
  payload: { message?: string; senderId?: string };
}) {
  console.log(`[Job] Executing Automations for Workspace ${workspaceId} on ${eventType}`);

  const { data: flows } = await supabaseAdmin
    .from('automation_flows')
    .select('id, flow_json, activepieces_flow_id')
    .eq('workspace_id', workspaceId)
    .eq('trigger_type', eventType)
    .eq('is_active', true);

  if (!flows || flows.length === 0) return;

  const content = payload.message?.toLowerCase() || '';
  const webhookUrl = process.env.ACTIVEPIECES_WEBHOOK_URL;

  for (const flow of flows) {
    const nodes = flow.flow_json.nodes || [];
    const conditionNode = nodes.find((n: { data?: { label?: string } }) => n.data?.label?.includes('Condition:'));
    let matched = true;

    if (conditionNode?.data?.label) {
      const keywordMatch = conditionNode.data.label.match(/"([^"]+)"/);
      if (keywordMatch && !content.includes(keywordMatch[1].toLowerCase())) {
        matched = false;
      }
    }

    if (!matched) continue;

    console.log(`[Automation] Match found for Flow ${flow.id}. Executing actions...`);

    if (webhookUrl) {
      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspace_id: workspaceId,
            flow_id: flow.id,
            activepieces_flow_id: flow.activepieces_flow_id,
            platform,
            event_type: eventType,
            payload,
          }),
          signal: AbortSignal.timeout(15_000),
        });

        if (!response.ok) {
          console.error(`[Automation] Activepieces webhook failed: HTTP ${response.status}`);
        }
      } catch (err) {
        console.error('[Automation] Activepieces webhook error:', err);
      }
    }

    await supabaseAdmin.rpc('increment_execution_count', { flow_id: flow.id });
  }
}
