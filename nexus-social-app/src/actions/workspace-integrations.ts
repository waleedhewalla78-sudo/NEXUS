'use server';

import { createActionClient } from '@/lib/supabase/action';
import { supabaseAdmin } from '@/lib/supabase/server';
import type { MetaAppReviewStatus } from '@/lib/workspace/meta-app-review';

export type SocialPlatform =
  | 'Twitter'
  | 'LinkedIn'
  | 'Instagram'
  | 'Facebook'
  | 'YouTube'
  | 'TikTok';

export interface SocialAccountConfig {
  handle: string;
  profileUrl: string;
  connected: boolean;
}

export interface MessagingChannel {
  id: string;
  channel_type: string;
  phone_number: string;
  is_active: boolean;
  chatwoot_inbox_id: number;
}

export interface WorkspaceIntegrations {
  websiteUrl: string;
  nexusPageSlug: string;
  socialAccounts: Record<SocialPlatform, SocialAccountConfig>;
  messagingChannels: MessagingChannel[];
  metaAppReviewStatus: MetaAppReviewStatus;
  integrations: {
    chatwoot: boolean;
    dify: boolean;
  };
}

const PLATFORMS: SocialPlatform[] = [
  'Twitter',
  'LinkedIn',
  'Instagram',
  'Facebook',
  'YouTube',
  'TikTok',
];

const PLATFORM_TO_CONNECTION: Partial<Record<SocialPlatform, string>> = {
  Facebook: 'facebook',
  Instagram: 'instagram',
  LinkedIn: 'linkedin',
  Twitter: 'x',
};

const DEFAULT_SOCIAL: Record<SocialPlatform, SocialAccountConfig> = {
  Twitter: { handle: '', profileUrl: '', connected: false },
  LinkedIn: { handle: '', profileUrl: '', connected: false },
  Instagram: { handle: '', profileUrl: '', connected: false },
  Facebook: {
    handle: '',
    profileUrl: 'https://www.facebook.com/share/p/1BhY5D36Qm/',
    connected: false,
  },
  YouTube: { handle: '', profileUrl: '', connected: false },
  TikTok: { handle: '', profileUrl: '', connected: false },
};

async function verifyWorkspaceMembership(workspaceId: string) {
  const supabase = await createActionClient();
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) throw new Error('Unauthenticated');

  const { data: member, error: memberError } = await supabaseAdmin
    .from('workspace_members')
    .select('id')
    .eq('user_id', session.user.id)
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  if (memberError || !member) {
    throw new Error('Unauthorized: You are not a member of this workspace.');
  }

  return session.user.id;
}

function normalizeSocialAccounts(raw: unknown): Record<SocialPlatform, SocialAccountConfig> {
  const merged = { ...DEFAULT_SOCIAL };
  if (!raw || typeof raw !== 'object') return merged;

  for (const platform of PLATFORMS) {
    const entry = (raw as Record<string, unknown>)[platform];
    if (!entry || typeof entry !== 'object') continue;
    const cfg = entry as Record<string, unknown>;
    merged[platform] = {
      handle: typeof cfg.handle === 'string' ? cfg.handle : '',
      profileUrl: typeof cfg.profileUrl === 'string' ? cfg.profileUrl : '',
      connected: Boolean(cfg.connected),
    };
  }
  return merged;
}

async function loadOAuthConnections(workspaceId: string) {
  const { data, error } = await supabaseAdmin
    .from('workspace_social_connections')
    .select('platform, account_name, account_handle, disconnected_at')
    .eq('workspace_id', workspaceId)
    .is('disconnected_at', null);

  if (error) {
    console.warn('[integrations] workspace_social_connections:', error.message);
    return [];
  }

  return data ?? [];
}

function applyOAuthConnections(
  socialAccounts: Record<SocialPlatform, SocialAccountConfig>,
  connections: Array<{
    platform: string;
    account_name: string | null;
    account_handle: string | null;
  }>,
): Record<SocialPlatform, SocialAccountConfig> {
  const next = { ...socialAccounts };

  for (const [uiPlatform, dbPlatform] of Object.entries(PLATFORM_TO_CONNECTION)) {
    const match = connections.find((row) => row.platform === dbPlatform);
    if (!match) continue;

    next[uiPlatform as SocialPlatform] = {
      handle: match.account_handle ?? match.account_name ?? next[uiPlatform as SocialPlatform].handle,
      profileUrl: next[uiPlatform as SocialPlatform].profileUrl,
      connected: true,
    };
  }

  return next;
}

export async function getWorkspaceIntegrations(workspaceId: string): Promise<WorkspaceIntegrations> {
  if (!workspaceId) throw new Error('Workspace ID is required');
  await verifyWorkspaceMembership(workspaceId);

  const supabase = await createActionClient();

  const { data: workspace, error: wsError } = await supabase
    .from('workspaces')
    .select('branding, slug, meta_app_review_status')
    .eq('id', workspaceId)
    .maybeSingle();

  if (wsError) {
    throw new Error(wsError.message || 'Failed to load workspace');
  }

  const branding = (workspace?.branding as Record<string, unknown> | null) ?? {};

  const { data: channels } = await supabase
    .from('channel_credentials')
    .select('id, channel_type, phone_number, is_active, chatwoot_inbox_id')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  const connections = await loadOAuthConnections(workspaceId);
  const brandingSocial = normalizeSocialAccounts(branding.social_accounts);
  const socialAccounts = applyOAuthConnections(brandingSocial, connections);

  return {
    websiteUrl: typeof branding.website_url === 'string' ? branding.website_url : '',
    nexusPageSlug:
      typeof branding.nexus_page_slug === 'string'
        ? branding.nexus_page_slug
        : (workspace?.slug ?? ''),
    socialAccounts,
    messagingChannels: (channels as MessagingChannel[]) ?? [],
    metaAppReviewStatus:
      (workspace?.meta_app_review_status as MetaAppReviewStatus | undefined) ?? 'pending',
    integrations: {
      chatwoot: Boolean(process.env.CHATWOOT_BASE_URL && process.env.CHATWOOT_API_TOKEN),
      dify: Boolean(process.env.DIFY_BASE_URL && process.env.DIFY_API_KEY),
    },
  };
}

export async function saveWorkspaceIntegrations(
  workspaceId: string,
  payload: {
    websiteUrl: string;
    nexusPageSlug: string;
    socialAccounts: Record<SocialPlatform, SocialAccountConfig>;
  },
): Promise<void> {
  await verifyWorkspaceMembership(workspaceId);

  const supabase = await createActionClient();

  const { data: existing, error: fetchError } = await supabase
    .from('workspaces')
    .select('branding')
    .eq('id', workspaceId)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message || 'Workspace not found');

  const current = (existing?.branding as Record<string, unknown> | null) ?? {};
  const socialAccounts: Record<SocialPlatform, SocialAccountConfig> = { ...DEFAULT_SOCIAL };

  for (const platform of PLATFORMS) {
    const incoming = payload.socialAccounts[platform];
    socialAccounts[platform] = {
      handle: incoming?.handle?.trim() ?? '',
      profileUrl: incoming?.profileUrl?.trim() ?? '',
      connected: Boolean(incoming?.handle?.trim() || incoming?.profileUrl?.trim()),
    };
  }

  const updated = {
    ...current,
    website_url: payload.websiteUrl.trim(),
    nexus_page_slug: payload.nexusPageSlug.trim(),
    social_accounts: socialAccounts,
  };

  const { error: updateError } = await supabase
    .from('workspaces')
    .update({ branding: updated })
    .eq('id', workspaceId);

  if (updateError) {
    throw new Error(updateError.message || 'Unable to save integrations');
  }
}
