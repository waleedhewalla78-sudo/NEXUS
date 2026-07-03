import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/api-auth';
import {
  COMPLIANCE_PROFILE_CATALOG,
  type ComplianceProfileId,
  isValidComplianceProfileId,
} from '@/lib/governance/compliance-profiles/mena-v1';
import {
  getWorkspaceComplianceProfile,
  setWorkspaceComplianceProfile,
} from '@/lib/governance/compliance-profile-store';

/**
 * GET /api/v1/workspaces/compliance-profile
 * PATCH body: { profileId: 'mena_v1' | 'global_default' }
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateApiRequest(req);
  if (!auth.ok) return auth.response;

  const settings = await getWorkspaceComplianceProfile(auth.workspaceId);
  return NextResponse.json({
    profileId: settings.profileId,
    meta: settings.meta,
    catalog: COMPLIANCE_PROFILE_CATALOG,
  });
}

export async function PATCH(req: NextRequest) {
  const auth = await authenticateApiRequest(req);
  if (!auth.ok) return auth.response;

  let body: { profileId?: ComplianceProfileId };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!isValidComplianceProfileId(body.profileId)) {
    return NextResponse.json({ error: 'Invalid profileId' }, { status: 400 });
  }

  const result = await setWorkspaceComplianceProfile(auth.workspaceId, body.profileId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  const settings = await getWorkspaceComplianceProfile(auth.workspaceId);
  return NextResponse.json({ profileId: settings.profileId, meta: settings.meta });
}
