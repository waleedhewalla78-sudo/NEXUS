'use server';

import { supabaseAdmin } from '@/lib/supabase/server';
import { createActionClient } from '@/lib/supabase/action';
import { automationTemplates } from '@/lib/automations/templates';

async function verifyWorkspaceMembership(workspaceId: string) {
  const supabase = await createActionClient();
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) throw new Error('Unauthenticated');

  const { data: member, error: memErr } = await supabaseAdmin
    .from('workspace_members')
    .select('id')
    .eq('user_id', session.user.id)
    .eq('workspace_id', workspaceId)
    .single();

  if (memErr || !member) throw new Error('Unauthorized');
}

function cloneFlowJson(flowJson: { nodes: { id: string }[]; edges: { id: string; source: string; target: string }[] }) {
  const clonedFlow = JSON.parse(JSON.stringify(flowJson));
  const idMap: Record<string, string> = {};

  clonedFlow.nodes.forEach((node: { id: string }) => {
    const newId = crypto.randomUUID();
    idMap[node.id] = newId;
    node.id = newId;
  });

  clonedFlow.edges.forEach((edge: { id: string; source: string; target: string }) => {
    edge.id = crypto.randomUUID();
    if (idMap[edge.source]) edge.source = idMap[edge.source];
    if (idMap[edge.target]) edge.target = idMap[edge.target];
  });

  return clonedFlow;
}

export async function cloneTemplate(templateId: string, workspaceId: string) {
  await verifyWorkspaceMembership(workspaceId);

  const template = automationTemplates.find((t) => t.id === templateId);
  if (!template) throw new Error('Template not found');

  const clonedFlow = cloneFlowJson(template.flow_json);

  const { data, error } = await supabaseAdmin
    .from('automation_flows')
    .insert({
      workspace_id: workspaceId,
      name: `${template.name} (Clone)`,
      trigger_type: template.trigger_type,
      flow_json: clonedFlow,
      is_active: false,
    })
    .select('id, flow_json')
    .single();

  if (error) {
    // Table missing or schema mismatch — still return flow for the builder UI
    return { id: null, flow_json: clonedFlow, persisted: false };
  }

  return { ...data, persisted: true };
}
