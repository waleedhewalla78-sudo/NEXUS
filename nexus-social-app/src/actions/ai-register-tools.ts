'use server';

import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { nexusToolsOpenApiSpec } from '@/lib/tools/openapi-specs';

/**
 * Task 2: Dify Tool Registration
 * Registers the OpenAPI spec as Custom Tools inside the workspace's Dify App.
 */
export async function registerWorkspaceTools(workspaceId: string) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    // @ts-expect-error Next.js 15 async cookies conflict
    { cookies }
  );

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Unauthorized');

  // Verify Admin role
  const { data: memberCheck } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', session.user.id)
    .single();

  if (!memberCheck || (memberCheck.role !== 'owner' && memberCheck.role !== 'admin')) {
    throw new Error('Forbidden: Only admins can register tools.');
  }

  // 1. Get Dify App ID
  const { data: config } = await supabase
    .from('ai_agent_configs')
    .select('dify_app_id')
    .eq('workspace_id', workspaceId)
    .single();

  if (!config || !config.dify_app_id) {
    throw new Error('AI Agent not provisioned for this workspace.');
  }

  const difyBase = process.env.DIFY_BASE_URL?.replace(/\/$/, '') ?? '';
  const difyAdminKey = process.env.DIFY_ADMIN_API_KEY ?? '';

  if (!difyBase || !difyAdminKey) {
    throw new Error('Dify admin configuration missing');
  }

  const internalToolSecret = process.env.INTERNAL_TOOL_SECRET;
  if (!internalToolSecret) {
    throw new Error('INTERNAL_TOOL_SECRET is not configured on the server.');
  }

  try {
    // 2. Call Dify API to register the OpenAPI tool provider for this app/workspace
    // Dify API allows registering a Custom Tool Provider using an OpenAPI schema
    const payload = {
      name: `nexus_tools_${workspaceId.replace(/-/g, '')}`,
      schema_type: 'openapi',
      schema: JSON.stringify(nexusToolsOpenApiSpec),
      credentials: {
        auth_type: 'api_key',
        api_key_header_prefix: 'Bearer',
        api_key_header_name: 'Authorization',
        api_key_value: internalToolSecret
      }
    };

    // Assuming Dify's tool provider creation endpoint (provider APIs in Dify can vary, 
    // using the standard structure for OpenAPI imports)
    const registerRes = await fetch(`${difyBase}/v1/workspaces/current/tool-providers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${difyAdminKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!registerRes.ok) {
      throw new Error(`Dify tool registration failed: ${await registerRes.text()}`);
    }

    const data = await registerRes.json();

    return {
      success: true,
      providerId: data.id,
      message: 'Nexus Social backend tools successfully bound to Dify AI.'
    };

  } catch (error: any) {
    console.error('Tool registration error:', error);
    throw new Error(error.message);
  }
}
