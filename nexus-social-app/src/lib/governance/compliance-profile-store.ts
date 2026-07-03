/**
 * Workspace compliance profile — stored in workspaces.branding.compliance_profile (CL-028).
 */

import { supabaseAdmin } from '@/lib/supabase/server';
import {
  COMPLIANCE_PROFILE_CATALOG,
  GLOBAL_DEFAULT_PROFILE_ID,
  type ComplianceProfileId,
  isValidComplianceProfileId,
} from '@/lib/governance/compliance-profiles/mena-v1';

export type WorkspaceComplianceSettings = {
  profileId: ComplianceProfileId;
  meta: (typeof COMPLIANCE_PROFILE_CATALOG)[ComplianceProfileId];
};

export async function getWorkspaceComplianceProfile(
  workspaceId: string,
): Promise<WorkspaceComplianceSettings> {
  const { data, error } = await supabaseAdmin
    .from('workspaces')
    .select('branding')
    .eq('id', workspaceId)
    .maybeSingle();

  if (error) {
    console.warn('[compliance-profile] load failed:', error.message);
  }

  const branding = (data?.branding as Record<string, unknown> | null) ?? {};
  const raw = branding.compliance_profile;
  const profileId = isValidComplianceProfileId(raw) ? raw : GLOBAL_DEFAULT_PROFILE_ID;

  return {
    profileId,
    meta: COMPLIANCE_PROFILE_CATALOG[profileId],
  };
}

export async function setWorkspaceComplianceProfile(
  workspaceId: string,
  profileId: ComplianceProfileId,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isValidComplianceProfileId(profileId)) {
    return { ok: false, error: 'Invalid compliance profile' };
  }

  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('workspaces')
    .select('branding')
    .eq('id', workspaceId)
    .maybeSingle();

  if (fetchError || !existing) {
    return { ok: false, error: fetchError?.message ?? 'Workspace not found' };
  }

  const branding = (existing.branding as Record<string, unknown> | null) ?? {};
  const updated = { ...branding, compliance_profile: profileId };

  const { error: updateError } = await supabaseAdmin
    .from('workspaces')
    .update({ branding: updated })
    .eq('id', workspaceId);

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  return { ok: true };
}
