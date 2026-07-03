import type { OAuthStatePlatform } from './types';

function settingsBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3005';
}

export function oauthSettingsRedirect({
  platform,
  outcome,
  message,
}: {
  platform: OAuthStatePlatform;
  outcome: 'success' | 'error';
  message?: string;
}): URL {
  const url = new URL('/settings', settingsBaseUrl());
  url.hash = 'nav-settings-channels';
  url.searchParams.set('oauth', outcome);
  url.searchParams.set('platform', platform);
  if (message) {
    url.searchParams.set('message', message.slice(0, 200));
  }
  return url;
}
