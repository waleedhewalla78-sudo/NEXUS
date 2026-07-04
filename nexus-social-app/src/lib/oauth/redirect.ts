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
  // Integrations live on the settings hub (no separate /settings/integrations route).
  const url = new URL('/settings', settingsBaseUrl());
  url.hash = 'nav-settings-channels';
  url.searchParams.set('oauth', outcome);
  url.searchParams.set('platform', platform);
  if (outcome === 'success' && !message) {
    url.searchParams.set('message', `${platform} connected`);
  }
  if (message) {
    url.searchParams.set('message', message.slice(0, 200));
  }
  return url;
}
