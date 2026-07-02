import { NextRequest, NextResponse } from 'next/server';
import { upsertSocialConnection } from '@/lib/oauth/connection-store';
import { metaOAuth, META_SCOPES } from '@/lib/oauth/providers/meta';
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
      platform: 'facebook',
      outcome: 'error',
      message: errorDescription ?? errorParam,
    });
    return NextResponse.redirect(redirect);
  }

  const code = request.nextUrl.searchParams.get('code');
  const stateParam = request.nextUrl.searchParams.get('state');

  if (!code || !stateParam) {
    const redirect = oauthSettingsRedirect({
      platform: 'facebook',
      outcome: 'error',
      message: 'Missing authorization code or state',
    });
    return NextResponse.redirect(redirect);
  }

  try {
    const state = verifyOAuthState(stateParam);
    if (state.platform !== 'facebook') {
      throw new Error('OAuth state platform mismatch');
    }

    const shortLived = await metaOAuth.exchangeMetaCode(code);
    const longLived = await metaOAuth.exchangeMetaLongLivedToken(shortLived.access_token);
    const pageAccounts = await metaOAuth.resolveMetaPageAccounts(longLived.access_token);

    for (const account of pageAccounts) {
      await upsertSocialConnection({
        workspaceId: state.workspaceId,
        platform: account.platform,
        accountId: account.accountId,
        accountName: account.accountName,
        accountHandle: account.accountHandle,
        accessToken: account.pageAccessToken,
        refreshToken: null,
        expiresAt: expiresAtFromSeconds(longLived.expires_in),
        scopes: META_SCOPES,
        metadata: account.metadata,
      });
    }

    const redirect = oauthSettingsRedirect({ platform: 'facebook', outcome: 'success' });
    return NextResponse.redirect(redirect);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Meta OAuth callback failed';
    const redirect = oauthSettingsRedirect({
      platform: 'facebook',
      outcome: 'error',
      message,
    });
    return NextResponse.redirect(redirect);
  }
}
