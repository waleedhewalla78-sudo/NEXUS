import { NextRequest, NextResponse } from 'next/server';
import { upsertSocialConnection } from '@/lib/oauth/connection-store';
import { linkedInOAuth, LINKEDIN_SCOPES } from '@/lib/oauth/providers/linkedin';
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
      platform: 'linkedin',
      outcome: 'error',
      message: errorDescription ?? errorParam,
    });
    return NextResponse.redirect(redirect);
  }

  const code = request.nextUrl.searchParams.get('code');
  const stateParam = request.nextUrl.searchParams.get('state');

  if (!code || !stateParam) {
    const redirect = oauthSettingsRedirect({
      platform: 'linkedin',
      outcome: 'error',
      message: 'Missing authorization code or state',
    });
    return NextResponse.redirect(redirect);
  }

  try {
    const state = verifyOAuthState(stateParam);
    if (state.platform !== 'linkedin') {
      throw new Error('OAuth state platform mismatch');
    }

    const tokenResponse = await linkedInOAuth.exchangeLinkedInCode(code);
    const account = await linkedInOAuth.resolveLinkedInAccount(tokenResponse.access_token);

    await upsertSocialConnection({
      workspaceId: state.workspaceId,
      platform: 'linkedin',
      accountId: account.accountId,
      accountName: account.accountName,
      accountHandle: account.accountHandle,
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token ?? null,
      expiresAt: expiresAtFromSeconds(tokenResponse.expires_in),
      scopes: tokenResponse.scope?.split(/\s+/).filter(Boolean) ?? LINKEDIN_SCOPES,
      metadata: {
        author_urn: account.authorUrn,
        oauth_provider: 'linkedin',
      },
    });

    const redirect = oauthSettingsRedirect({ platform: 'linkedin', outcome: 'success' });
    return NextResponse.redirect(redirect);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'LinkedIn OAuth callback failed';
    const redirect = oauthSettingsRedirect({
      platform: 'linkedin',
      outcome: 'error',
      message,
    });
    return NextResponse.redirect(redirect);
  }
}
