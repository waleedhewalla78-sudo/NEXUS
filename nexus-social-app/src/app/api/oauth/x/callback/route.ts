import { NextRequest, NextResponse } from 'next/server';
import { upsertSocialConnection } from '@/lib/oauth/connection-store';
import { xOAuth, X_SCOPES } from '@/lib/oauth/providers/x';
import { oauthSettingsRedirect } from '@/lib/oauth/redirect';
import { verifyOAuthState } from '@/lib/oauth/state';

export const runtime = 'nodejs';

function expiresAtFromSeconds(expiresIn: number | undefined): Date | null {
  if (!expiresIn || expiresIn <= 0) return null;
  return new Date(Date.now() + expiresIn * 1000);
}

export async function GET(request: NextRequest) {
  const errorParam = request.nextUrl.searchParams.get('error');
  const errorDescription = request.nextUrl.searchParams.get('error_description');

  if (errorParam) {
    const redirect = oauthSettingsRedirect({
      platform: 'x',
      outcome: 'error',
      message: errorDescription ?? errorParam,
    });
    return NextResponse.redirect(redirect);
  }

  const code = request.nextUrl.searchParams.get('code');
  const stateParam = request.nextUrl.searchParams.get('state');

  if (!code || !stateParam) {
    const redirect = oauthSettingsRedirect({
      platform: 'x',
      outcome: 'error',
      message: 'Missing authorization code or state',
    });
    return NextResponse.redirect(redirect);
  }

  try {
    const state = verifyOAuthState(stateParam);
    if (state.platform !== 'x') {
      throw new Error('OAuth state platform mismatch');
    }
    if (!state.codeVerifier) {
      throw new Error('Missing PKCE verifier in OAuth state');
    }

    const tokenResponse = await xOAuth.exchangeXCode({ code, codeVerifier: state.codeVerifier });
    const account = await xOAuth.resolveXAccount(tokenResponse.access_token);

    await upsertSocialConnection({
      workspaceId: state.workspaceId,
      platform: 'x',
      accountId: account.accountId,
      accountName: account.accountName,
      accountHandle: account.accountHandle,
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token ?? null,
      expiresAt: expiresAtFromSeconds(tokenResponse.expires_in),
      scopes: tokenResponse.scope?.split(/\s+/).filter(Boolean) ?? X_SCOPES,
      metadata: {
        oauth_provider: 'x',
      },
    });

    const redirect = oauthSettingsRedirect({ platform: 'x', outcome: 'success' });
    return NextResponse.redirect(redirect);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'X OAuth callback failed';
    const redirect = oauthSettingsRedirect({
      platform: 'x',
      outcome: 'error',
      message,
    });
    return NextResponse.redirect(redirect);
  }
}
