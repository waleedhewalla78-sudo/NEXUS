import { NextRequest, NextResponse } from 'next/server';
import { requireOAuthUser, verifyWorkspaceMembership } from '@/lib/oauth/auth-guard';
import { createOAuthState } from '@/lib/oauth/state';
import { xOAuth } from '@/lib/oauth/providers/x';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const workspaceId = request.nextUrl.searchParams.get('workspace_id');
    if (!workspaceId) {
      return NextResponse.json({ error: 'workspace_id is required' }, { status: 400 });
    }

    const { userId } = await requireOAuthUser();
    await verifyWorkspaceMembership({ userId, workspaceId });

    const { codeVerifier, codeChallenge } = xOAuth.generatePkcePair();
    const state = createOAuthState({
      workspaceId,
      userId,
      platform: 'x',
      codeVerifier,
    });

    const authorizationUrl = xOAuth.buildXAuthorizationUrl({ state, codeChallenge });
    return NextResponse.redirect(authorizationUrl);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'OAuth start failed';
    const status = message === 'Unauthenticated' ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
