import { NextRequest, NextResponse } from 'next/server';
import { requireOAuthUser, verifyWorkspaceMembership } from '@/lib/oauth/auth-guard';
import { createOAuthState } from '@/lib/oauth/state';
import { hubSpotOAuth } from '@/lib/crm/hubspot-oauth';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const workspaceId = request.nextUrl.searchParams.get('workspace_id');
    if (!workspaceId) {
      return NextResponse.json({ error: 'workspace_id is required' }, { status: 400 });
    }

    const { userId } = await requireOAuthUser();
    await verifyWorkspaceMembership({ userId, workspaceId });

    const state = createOAuthState({
      workspaceId,
      userId,
      platform: 'hubspot',
    });

    const authorizationUrl = hubSpotOAuth.buildHubSpotAuthorizationUrl(state);
    return NextResponse.redirect(authorizationUrl);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'HubSpot OAuth start failed';
    const status = message === 'Unauthenticated' ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
