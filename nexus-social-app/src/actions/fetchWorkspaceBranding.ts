// src/actions/fetchWorkspaceBranding.ts
import { supabaseAdmin } from '@/lib/supabase/server';

/**
 * Fetch the branding JSON for a given workspace.
 */
export async function fetchWorkspaceBranding(workspaceId: string) {
  const { data, error } = await supabaseAdmin
    .from('workspaces')
    .select('branding')
    .eq('id', workspaceId)
    .single();

  if (error) {
    console.error('Failed to fetch branding:', error);
    throw new Error('Unable to load workspace branding');
  }

  // Ensure a fallback object if null
  return (data?.branding as any) ?? {
    logo_url: '',
    primary_color: '#3B82F6',
    accent_color: '#10B981',
  };
}
