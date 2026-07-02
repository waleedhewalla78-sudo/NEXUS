// src/actions/updateWorkspaceBranding.ts
import { supabaseAdmin } from '@/lib/supabase/server';

/**
 * Update the `branding` JSONB column for a workspace.
 * Accepts a partial branding object; fields not provided remain unchanged.
 */
export async function updateWorkspaceBranding({
  workspaceId,
  branding,
}: {
  workspaceId: string;
  branding: {
    logo_url?: string;
    primary_color?: string;
    accent_color?: string;
  };
}): Promise<void> {
  // Retrieve existing branding (if any) to merge with incoming values
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('workspaces')
    .select('branding')
    .eq('id', workspaceId)
    .single();

  if (fetchError) {
    console.error('Failed to fetch existing branding:', fetchError);
    throw new Error('Workspace not found');
  }

  const current = (existing as any).branding || {};
  const updated = { ...current, ...branding };

  const { error: updateError } = await supabaseAdmin
    .from('workspaces')
    .update({ branding: updated })
    .eq('id', workspaceId);

  if (updateError) {
    console.error('Failed to update branding:', updateError);
    throw new Error('Unable to update workspace branding');
  }
}
