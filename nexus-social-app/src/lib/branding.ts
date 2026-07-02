'use server';

import { supabaseAdmin } from '@/lib/supabase/server';

type BrandingJson = {
  logo_url?: string;
  primary_color?: string;
  accent_color?: string;
  brand_colors?: Record<string, string>;
};

/**
 * Fetch branding for the current workspace from the `branding` JSONB column.
 */
export async function fetchWorkspaceBranding(workspaceId: string) {
  if (!workspaceId) {
    return { logoUrl: '', brandColors: {} as Record<string, string> };
  }

  const { data, error } = await supabaseAdmin
    .from('workspaces')
    .select('branding')
    .eq('id', workspaceId)
    .maybeSingle();

  if (error) {
    // 42703 = undefined column (run src/sql/schema_patch.sql in Supabase)
    if (error.code !== '42703') {
      console.error('Failed to fetch workspace branding:', error.message);
    }
    return { logoUrl: '', brandColors: {} as Record<string, string> };
  }

  const branding = (data?.branding as BrandingJson | null) ?? {};
  const brandColors: Record<string, string> = {
    ...(branding.brand_colors ?? {}),
  };

  if (branding.primary_color) brandColors.primary = branding.primary_color;
  if (branding.accent_color) brandColors.accent = branding.accent_color;

  return {
    logoUrl: branding.logo_url ?? '',
    brandColors,
  };
}
