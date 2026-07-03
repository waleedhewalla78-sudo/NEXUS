'use server';

import { getUserWorkspaceContext } from '@/lib/auth/server-session';
import { createServerComponentClient } from '@/lib/supabase/action';

export type HubSpotIntegrationStub = {
  portalId: string;
  webhookUrl: string;
  oauthStatus: 'stub' | 'connected';
};

export async function getHubSpotIntegrationStub(): Promise<HubSpotIntegrationStub> {
  const { workspaceId } = await getUserWorkspaceContext();
  const supabase = await createServerComponentClient();

  const { data } = await supabase
    .from('workspaces')
    .select('branding')
    .eq('id', workspaceId)
    .maybeSingle();

  const branding = (data?.branding as Record<string, unknown> | null) ?? {};
  const hubspot = (branding.hubspot as Record<string, unknown> | null) ?? {};
  const portalId = typeof hubspot.portal_id === 'string' ? hubspot.portal_id : '';

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3005';
  const webhookUrl = `${appUrl}/api/integrations/crm/webhook/hubspot?workspaceId=${workspaceId}`;

  return {
    portalId,
    webhookUrl,
    oauthStatus: hubspot.oauth_connected === true ? 'connected' : 'stub',
  };
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
          oauth_connected: false,
        },
      },
    })
    .eq('id', workspaceId);

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}
