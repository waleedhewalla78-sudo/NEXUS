import { describe, expect, it } from 'vitest';
import { oauthReconnectPath } from '@/lib/oauth/reconnect-path';

describe('oauthReconnectPath', () => {
  it('maps UI platforms to OAuth start routes', () => {
    expect(oauthReconnectPath({ platform: 'LinkedIn', workspaceId: 'ws-1' })).toBe(
      '/api/oauth/linkedin/start?workspace_id=ws-1',
    );
    expect(oauthReconnectPath({ platform: 'Twitter', workspaceId: 'ws-1' })).toBe(
      '/api/oauth/x/start?workspace_id=ws-1',
    );
    expect(oauthReconnectPath({ platform: 'Facebook', workspaceId: 'ws-1' })).toBe(
      '/api/oauth/meta/start?workspace_id=ws-1',
    );
    expect(oauthReconnectPath({ platform: 'Instagram', workspaceId: 'ws-1' })).toBe(
      '/api/oauth/meta/start?workspace_id=ws-1',
    );
  });

  it('returns null for unsupported platforms', () => {
    expect(oauthReconnectPath({ platform: 'YouTube', workspaceId: 'ws-1' })).toBeNull();
  });
});
