'use server';

import { getUserWorkspaceContext } from '@/lib/auth/server-session';
import { createServerComponentClient } from '@/lib/supabase/action';
import { loadHubSpotStoredTokens } from '@/lib/crm/hubspot-token-store';

export type HubSpotIntegrationStatus = {
  portalId: string;
  webhookUrl: string;
  oauthStatus: 'disconnected' | 'connected' | 'private_app';
  hubDomain: string | null;
  connectedUserEmail: string | null;
  connectUrl: string;
};

export async function getHubSpotIntegrationStatus(): Promise<HubSpotIntegrationStatus> {
  const { workspaceId } = await getUserWorkspaceContext();
  const supabase = await createServerComponentClient();

  const { data } = await supabase
    .from('workspaces')
    .select('branding')
    .eq('id', workspaceId)
    .maybeSingle();

  const branding = (data?.branding as Record<string, unknown> | null) ?? {};
  const hubspot = (branding.hubspot as Record<string, unknown> | null) ?? {};
  const stored = await loadHubSpotStoredTokens(workspaceId);

  const portalId =
    stored?.portalId ||
    (typeof hubspot.portal_id === 'string' ? hubspot.portal_id : '');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3005';
  const webhookUrl = `${appUrl}/api/integrations/crm/webhook/hubspot?workspaceId=${workspaceId}`;
  const connectUrl = `${appUrl}/api/oauth/hubspot/start?workspace_id=${encodeURIComponent(workspaceId)}`;

  let oauthStatus: HubSpotIntegrationStatus['oauthStatus'] = 'disconnected';
  if (stored?.oauthConnected) {
    oauthStatus = 'connected';
  } else if (process.env.HUBSPOT_ACCESS_TOKEN) {
    oauthStatus = 'private_app';
  }

  return {
    portalId,
    webhookUrl,
    oauthStatus,
    hubDomain: typeof hubspot.hub_domain === 'string' ? hubspot.hub_domain : null,
    connectedUserEmail:
      typeof hubspot.connected_user_email === 'string' ? hubspot.connected_user_email : null,
    connectUrl,
  };
}

/** @deprecated Use getHubSpotIntegrationStatus */
export type HubSpotIntegrationStub = HubSpotIntegrationStatus;

/** @deprecated Use getHubSpotIntegrationStatus */
export async function getHubSpotIntegrationStub(): Promise<HubSpotIntegrationStatus> {
  return getHubSpotIntegrationStatus();
}

export async function saveHubSpotPortalId(portalId: string) {
  const { workspaceId } = await getUserWorkspaceContext();
  const supabase = await createServerComponentClient();

  const { data: existing } = await supabase
    .from('workspaces')
    .select('branding')
    .eq('id', workspaceId)
    .maybeSingle();

  const branding = (existing?.branding as Record<string, unknown> | null) ?? {};
  const hubspot = (branding.hubspot as Record<string, unknown> | null) ?? {};

  const { error } = await supabase
    .from('workspaces')
    .update({
      branding: {
        ...branding,
        hubspot: {
          ...hubspot,
          portal_id: portalId.trim(),
        },
      },
    })
    .eq('id', workspaceId);

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

export async function disconnectHubSpotOAuth() {
  const { workspaceId } = await getUserWorkspaceContext();
  const supabase = await createServerComponentClient();

  const { data: existing } = await supabase
    .from('workspaces')
    .select('branding')
    .eq('id', workspaceId)
    .maybeSingle();

  const branding = (existing?.branding as Record<string, unknown> | null) ?? {};
  const hubspot = (branding.hubspot as Record<string, unknown> | null) ?? {};
  const portalId = typeof hubspot.portal_id === 'string' ? hubspot.portal_id : '';

  const { error } = await supabase
    .from('workspaces')
    .update({
      branding: {
        ...branding,
        hubspot: {
          portal_id: portalId,
          oauth_connected: false,
        },
      },
    })
    .eq('id', workspaceId);

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}
