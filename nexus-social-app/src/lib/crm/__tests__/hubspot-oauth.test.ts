import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
  buildHubSpotAuthorizationUrl,
  getHubSpotRedirectUri,
  HUBSPOT_OAUTH_SCOPES,
} from '@/lib/crm/hubspot-oauth';

describe('hubspot-oauth', () => {
  const env = process.env;

  beforeEach(() => {
    process.env = { ...env };
    process.env.HUBSPOT_CLIENT_ID = 'test-client-id';
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3005';
  });

  afterEach(() => {
    process.env = env;
  });

  it('builds authorization URL with scopes and state', () => {
    const url = new URL(buildHubSpotAuthorizationUrl('state-token-123'));
    expect(url.hostname).toBe('app.hubspot.com');
    expect(url.pathname).toBe('/oauth/authorize');
    expect(url.searchParams.get('client_id')).toBe('test-client-id');
    expect(url.searchParams.get('state')).toBe('state-token-123');
    expect(url.searchParams.get('scope')).toBe(HUBSPOT_OAUTH_SCOPES.join(' '));
    expect(url.searchParams.get('redirect_uri')).toBe(getHubSpotRedirectUri());
  });
});
