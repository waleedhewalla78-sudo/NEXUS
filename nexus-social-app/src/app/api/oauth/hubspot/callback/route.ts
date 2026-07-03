import { NextRequest, NextResponse } from 'next/server';
import { hubSpotOAuth } from '@/lib/crm/hubspot-oauth';
import { saveHubSpotOAuthTokens } from '@/lib/crm/hubspot-token-store';
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
    return NextResponse.redirect(
      oauthSettingsRedirect({
        platform: 'hubspot',
        outcome: 'error',
        message: errorDescription ?? errorParam,
      }),
    );
  }

  const code = request.nextUrl.searchParams.get('code');
  const stateParam = request.nextUrl.searchParams.get('state');

  if (!code || !stateParam) {
    return NextResponse.redirect(
      oauthSettingsRedirect({
        platform: 'hubspot',
        outcome: 'error',
        message: 'Missing authorization code or state',
      }),
    );
  }

  try {
    const state = verifyOAuthState(stateParam);
    if (state.platform !== 'hubspot') {
      throw new Error('OAuth state platform mismatch');
    }

    const tokenResponse = await hubSpotOAuth.exchangeHubSpotCode(code);
    const metadata = await hubSpotOAuth.fetchHubSpotTokenMetadata(tokenResponse.access_token);

    const saved = await saveHubSpotOAuthTokens({
      workspaceId: state.workspaceId,
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token ?? null,
      expiresAt: expiresAtFromSeconds(tokenResponse.expires_in),
      portalId: String(metadata.hubId),
      hubDomain: metadata.hubDomain,
      userEmail: metadata.userEmail,
    });

    if (!saved.ok) {
      throw new Error(saved.error);
    }

    return NextResponse.redirect(
      oauthSettingsRedirect({ platform: 'hubspot', outcome: 'success' }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'HubSpot OAuth callback failed';
    return NextResponse.redirect(
      oauthSettingsRedirect({ platform: 'hubspot', outcome: 'error', message }),
    );
  }
}
