'use server';

import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

/**
 * Task 2: Multi-Tenant Dify Provisioning
 * Creates an isolated Dify Dataset and Chat App for a specific workspace.
 */
export async function provisionWorkspaceAgent(workspaceId: string, companyName: string) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    // @ts-expect-error Next.js 15 async cookies conflict
    { cookies }
  );

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Unauthorized');

  // Verify user belongs to workspace and is an admin/owner
  const { data: memberCheck } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', session.user.id)
    .single();

  if (!memberCheck || (memberCheck.role !== 'owner' && memberCheck.role !== 'admin')) {
    throw new Error('Forbidden: Only admins can provision AI agents.');
  }

  // 0. Prevent collision/orphaning by checking if an agent already exists
  const { data: existingConfig } = await supabase
    .from('ai_agent_configs')
    .select('dify_app_id, dify_dataset_id')
    .eq('workspace_id', workspaceId)
    .single();

  if (existingConfig) {
    return { 
      success: true, 
      appId: existingConfig.dify_app_id, 
      datasetId: existingConfig.dify_dataset_id,
      message: 'Agent already provisioned'
    };
  }

  const difyBase = process.env.DIFY_BASE_URL?.replace(/\/$/, '') ?? '';
  const difyAdminKey = process.env.DIFY_ADMIN_API_KEY ?? ''; // Requires a master Dify API key

  if (!difyBase || !difyAdminKey) {
    throw new Error('Dify admin configuration missing');
  }

  try {
    // 1. Create a new Knowledge Base Dataset in Dify
    const datasetPayload = {
      name: `${companyName} Knowledge Base`,
      description: `RAG dataset for ${companyName} customer support.`,
      indexing_technique: 'high_quality'
    };

    const datasetRes = await fetch(`${difyBase}/v1/datasets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${difyAdminKey}`,
      },
      body: JSON.stringify(datasetPayload),
    });

    if (!datasetRes.ok) throw new Error(`Dataset creation failed: ${await datasetRes.text()}`);
    const datasetData = await datasetRes.json();
    const datasetId = datasetData.id;

    // 2. Create a new Chat App in Dify
    const appPayload = {
      name: `${companyName} Customer Service Agent`,
      description: `AI Agent for ${companyName}`,
      mode: 'chat',
      icon: '🤖',
      icon_background: '#FFEAD5'
    };

    const appRes = await fetch(`${difyBase}/v1/apps`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${difyAdminKey}`,
      },
      body: JSON.stringify(appPayload),
    });

    if (!appRes.ok) throw new Error(`App creation failed: ${await appRes.text()}`);
    const appData = await appRes.json();
    const appId = appData.id;

    // Optional: You would normally link the dataset to the app via Dify's API here.
    // However, Dify's API usually handles document-to-dataset linking.

    // 3. Save mapping to Supabase (Upsert to prevent collision/orphaning)
    const { error: dbError } = await supabase
      .from('ai_agent_configs')
      .upsert({
        workspace_id: workspaceId,
        dify_app_id: appId,
        dify_dataset_id: datasetId,
        persona_name: `${companyName} Support Agent`,
        is_active: true
      }, { onConflict: 'workspace_id' });

    if (dbError) {
      // Rollback Dify creation if DB insert fails (would require delete endpoints)
      console.error('Failed to save agent config to DB. Orphans may exist in Dify.', dbError);
      throw new Error(`Database error: ${dbError.message}`);
    }

    return { success: true, appId, datasetId };

  } catch (error: any) {
    console.error('Failed to provision workspace agent:', error);
    throw new Error(error.message);
  }
}
