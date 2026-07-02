'use server';

import { supabaseAdmin } from '@/lib/supabase/server';

/**
 * Generates a full GDPR compliance payload for a workspace.
 */
export async function exportWorkspaceData(workspaceId: string, userId: string) {
  // 1. Verify User is an Admin
  const { data: member } = await supabaseAdmin
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .single();

  if (!member || member.role !== 'admin') {
    throw new Error('Unauthorized: Only admins can export workspace data');
  }

  // 2. Aggregate Data
  const { data: posts } = await supabaseAdmin.from('posts').select('*').eq('workspace_id', workspaceId);
  const { data: inbox } = await supabaseAdmin.from('unified_inbox').select('*').eq('workspace_id', workspaceId);
  const { data: pages } = await supabaseAdmin.from('nexus_pages').select('*').eq('workspace_id', workspaceId);

  const payload = {
    workspaceId,
    exportedAt: new Date().toISOString(),
    posts: posts || [],
    inbox: inbox || [],
    pages: pages || []
  };

  const payloadString = JSON.stringify(payload, null, 2);

  // 3. Upload to a temporary secure storage bucket
  const filename = `gdpr-export-${workspaceId}-${Date.now()}.json`;
  
  // Note: We assume an 'exports' private bucket is configured in Supabase
  const { error: uploadError } = await supabaseAdmin
    .storage
    .from('exports')
    .upload(filename, payloadString, { contentType: 'application/json' });

  if (uploadError) {
    throw new Error(`Failed to upload export bundle: ${uploadError.message}`);
  }

  // 4. Generate a short-lived download link (1 hour)
  const { data: signedUrl } = await supabaseAdmin
    .storage
    .from('exports')
    .createSignedUrl(filename, 3600);

  // 5. Audit Log the GDPR action
  const { auditLog } = await import('@/lib/audit');
  await auditLog(workspaceId, userId, 'gdpr.data_exported', { filename });

  return signedUrl?.signedUrl;
}

/**
 * Hard deletes a workspace and cascades to all data. Right to be forgotten.
 */
export async function deleteWorkspace(workspaceId: string, userId: string) {
  const { data: member } = await supabaseAdmin
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .single();

  if (!member || member.role !== 'admin') {
    throw new Error('Unauthorized');
  }

  // Because of `ON DELETE CASCADE` in our schema, deleting the workspace 
  // purges posts, inbox, pages, ledger, and subscriptions instantly.
  const { error } = await supabaseAdmin.from('workspaces').delete().eq('id', workspaceId);

  if (error) {
    throw new Error(`Failed to delete workspace: ${error.message}`);
  }

  return { success: true, message: 'Workspace permanently deleted.' };
}
