'use server';

import { supabaseAdmin } from '@/lib/supabase/server';
import { createActionClient } from '@/lib/supabase/action';

export interface AiAgentConfig {
  is_active: boolean;
  is_globally_disabled: boolean;
  traffic_allocation_percentage: number;
  daily_token_limit: number | null;
  dify_app_id: string;
  dify_dataset_id: string;
  dify_app_api_key: string;
  persona_name: string;
}

export type AiAgentConfigUpdate = Partial<
  Pick<
    AiAgentConfig,
    | 'is_active'
    | 'is_globally_disabled'
    | 'traffic_allocation_percentage'
    | 'daily_token_limit'
    | 'dify_app_id'
    | 'dify_dataset_id'
    | 'dify_app_api_key'
    | 'persona_name'
  >
>;

const DEFAULT_AI_AGENT_ROW = {
  dify_app_id: 'local-dev-app',
  dify_dataset_id: 'local-dev-dataset',
  dify_app_api_key: '',
  persona_name: 'Support Agent',
  is_active: true,
  is_globally_disabled: false,
  traffic_allocation_percentage: 100,
  daily_token_limit: 100000,
};

const SELECT_FIELDS =
  'is_active, is_globally_disabled, traffic_allocation_percentage, daily_token_limit, dify_app_id, dify_dataset_id, dify_app_api_key, persona_name';

function normalizeRow(data: Record<string, unknown>): AiAgentConfig {
  return {
    is_active: Boolean(data.is_active),
    is_globally_disabled: Boolean(data.is_globally_disabled),
    traffic_allocation_percentage: Number(data.traffic_allocation_percentage ?? 100),
    daily_token_limit:
      data.daily_token_limit === null || data.daily_token_limit === undefined
        ? null
        : Number(data.daily_token_limit),
    dify_app_id: String(data.dify_app_id ?? ''),
    dify_dataset_id: String(data.dify_dataset_id ?? ''),
    dify_app_api_key: String(data.dify_app_api_key ?? ''),
    persona_name: String(data.persona_name ?? 'Support Agent'),
  };
}

export async function ensureDefaultAiAgentConfig(workspaceId: string): Promise<AiAgentConfig | null> {
  const fallbackKey = process.env.DIFY_API_KEY ?? '';
  const { data, error } = await supabaseAdmin
    .from('ai_agent_configs')
    .upsert(
      {
        workspace_id: workspaceId,
        ...DEFAULT_AI_AGENT_ROW,
        dify_app_api_key: fallbackKey,
      },
      { onConflict: 'workspace_id' },
    )
    .select(SELECT_FIELDS)
    .single();

  if (error) {
    if (error.code === '42P01') return null;
    if (error.message?.includes('schema cache')) {
      console.error('[ai-agent] PostgREST schema cache stale — run schema_patch.sql in Supabase SQL Editor');
      return null;
    }
    return null;
  }

  return normalizeRow(data as Record<string, unknown>);
}

async function verifyAdminMembership(workspaceId: string) {
  const supabase = await createActionClient();
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) throw new Error('Unauthenticated');

  const { data: member, error: memErr } = await supabaseAdmin
    .from('workspace_members')
    .select('role')
    .eq('user_id', session.user.id)
    .eq('workspace_id', workspaceId)
    .single();

  if (memErr || !member) throw new Error('Unauthorized');
  if (member.role !== 'admin' && member.role !== 'owner') {
    throw new Error('Forbidden: admin role required');
  }
}

export async function getAiAgentConfig(workspaceId: string): Promise<AiAgentConfig | null> {
  await verifyAdminMembership(workspaceId);

  const { data, error } = await supabaseAdmin
    .from('ai_agent_configs')
    .select(SELECT_FIELDS)
    .eq('workspace_id', workspaceId)
    .single();

  if (error || !data) {
    if (error?.code === '42P01') return null;
    if (error?.code === 'PGRST116' || !data) {
      return ensureDefaultAiAgentConfig(workspaceId);
    }
    return null;
  }
  return normalizeRow(data as Record<string, unknown>);
}

export async function updateAiAgentConfig(
  workspaceId: string,
  updates: AiAgentConfigUpdate,
): Promise<void> {
  await verifyAdminMembership(workspaceId);

  const { error } = await supabaseAdmin
    .from('ai_agent_configs')
    .update(updates)
    .eq('workspace_id', workspaceId);

  if (error) throw new Error('Failed to update AI agent configuration');
}

export async function testAiAgentConnection(workspaceId: string): Promise<{ ok: boolean; message: string }> {
  await verifyAdminMembership(workspaceId);

  const { data } = await supabaseAdmin
    .from('ai_agent_configs')
    .select('dify_app_api_key, is_active, is_globally_disabled')
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  const difyBase = process.env.DIFY_BASE_URL?.replace(/\/$/, '') ?? '';
  const apiKey = (data?.dify_app_api_key as string) || process.env.DIFY_API_KEY || '';

  if (data?.is_globally_disabled) {
    return { ok: false, message: 'Global kill switch is ON — turn it off under Runtime controls.' };
  }
  if (data && !data.is_active) {
    return { ok: false, message: 'AI agent is inactive — enable “AI agent active” below.' };
  }
  if (!difyBase || !apiKey) {
    return {
      ok: false,
      message:
        'Missing Dify app API key. Add DIFY_API_KEY=app-... to .env.local or paste the key in “Dify app API key” above, then Save.',
    };
  }

  try {
    const res = await fetch(`${difyBase}/v1/chat-messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: {},
        query: 'Reply with exactly: Nexus AI test OK',
        response_mode: 'blocking',
        user: `nexus-test-${workspaceId.slice(0, 8)}`,
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      return { ok: false, message: `Dify returned ${res.status}: ${txt.slice(0, 200)}` };
    }

    const json = (await res.json()) as { answer?: string };
    return {
      ok: true,
      message: json.answer ? `Connected. Sample: ${json.answer.slice(0, 120)}` : 'Connected to Dify.',
    };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Connection failed' };
  }
}
