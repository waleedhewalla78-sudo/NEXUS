'use server';

import { getUserWorkspaceContext } from '@/lib/auth/server-session';
import {
  COMPLIANCE_PROFILE_CATALOG,
  type ComplianceProfileId,
  isValidComplianceProfileId,
} from '@/lib/governance/compliance-profiles/mena-v1';
import {
  getWorkspaceComplianceProfile,
  setWorkspaceComplianceProfile,
} from '@/lib/governance/compliance-profile-store';

export async function getComplianceProfileSettings() {
  const { workspaceId } = await getUserWorkspaceContext();
  const settings = await getWorkspaceComplianceProfile(workspaceId);
  return {
    profileId: settings.profileId,
    meta: settings.meta,
    catalog: COMPLIANCE_PROFILE_CATALOG,
  };
}

export async function saveComplianceProfileSettings(profileId: ComplianceProfileId) {
  if (!isValidComplianceProfileId(profileId)) {
    return { ok: false as const, error: 'Invalid profile' };
  }
  const { workspaceId } = await getUserWorkspaceContext();
  const result = await setWorkspaceComplianceProfile(workspaceId, profileId);
  if (!result.ok) return { ok: false as const, error: result.error };
  return { ok: true as const };
}
