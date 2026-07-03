'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Bot,
  Briefcase,
  Camera,
  Globe,
  Link2,
  MessageCircle,
  Music2,
  Phone,
  Play,
  Settings,
  Users,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useWorkspaceStore } from '@/store/workspace';
import {
  getWorkspaceIntegrations,
  saveWorkspaceIntegrations,
  type SocialPlatform,
  type WorkspaceIntegrations,
} from '@/actions/workspace-integrations';
import { metaAppReviewUtils, type MetaAppReviewStatus } from '@/lib/workspace/meta-app-review';
import { oauthReconnectPath } from '@/lib/oauth/reconnect-path';
import { ConnectChannelDialog } from '@/components/settings/ConnectChannelDialog';
import { HubSpotIntegrationStub } from '@/components/settings/HubSpotIntegrationStub';

const SOCIAL_META: Record<
  SocialPlatform,
  { icon: React.ReactNode; placeholder: string; urlPlaceholder: string }
> = {
  Twitter: {
    icon: <MessageCircle className="w-5 h-5 text-sky-400" />,
    placeholder: '@nexus_social',
    urlPlaceholder: 'https://twitter.com/nexus_social',
  },
  LinkedIn: {
    icon: <Briefcase className="w-5 h-5 text-blue-500" />,
    placeholder: 'nexus-social',
    urlPlaceholder: 'https://linkedin.com/company/nexus-social',
  },
  Instagram: {
    icon: <Camera className="w-5 h-5 text-pink-400" />,
    placeholder: '@nexus_social',
    urlPlaceholder: 'https://instagram.com/nexus_social',
  },
  Facebook: {
    icon: <Users className="w-5 h-5 text-blue-600" />,
    placeholder: 'NexusSocial',
    urlPlaceholder: 'https://www.facebook.com/share/p/1BhY5D36Qm/',
  },
  YouTube: {
    icon: <Play className="w-5 h-5 text-red-600" />,
    placeholder: '@nexus_social',
    urlPlaceholder: 'https://youtube.com/@nexus_social',
  },
  TikTok: {
    icon: <Music2 className="w-5 h-5 text-gray-900" />,
    placeholder: '@nexus_social',
    urlPlaceholder: 'https://tiktok.com/@nexus_social',
  },
};

const PLATFORMS: SocialPlatform[] = [
  'Twitter',
  'LinkedIn',
  'Instagram',
  'Facebook',
  'YouTube',
  'TikTok',
];

const OAUTH_PLATFORMS: SocialPlatform[] = ['Twitter', 'LinkedIn', 'Facebook', 'Instagram'];

export default function SettingsHub() {
  const workspaceId = useWorkspaceStore((s) => s.workspaceId);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [channelDialogOpen, setChannelDialogOpen] = useState(false);
  const [integrations, setIntegrations] = useState<WorkspaceIntegrations | null>(null);

  const loadIntegrations = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const data = await getWorkspaceIntegrations(workspaceId);
      setIntegrations(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    if (workspaceId) {
      loadIntegrations();
    }
  }, [workspaceId, loadIntegrations]);

  useEffect(() => {
    const onFocus = () => {
      if (workspaceId) loadIntegrations();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [workspaceId, loadIntegrations]);

  const updateSocial = (platform: SocialPlatform, field: 'handle' | 'profileUrl', value: string) => {
    if (!integrations) return;
    setIntegrations({
      ...integrations,
      socialAccounts: {
        ...integrations.socialAccounts,
        [platform]: { ...integrations.socialAccounts[platform], [field]: value },
      },
    });
  };

  const handleSave = async () => {
    if (!workspaceId || !integrations) return;
    setSaving(true);
    try {
      await saveWorkspaceIntegrations(workspaceId, {
        websiteUrl: integrations.websiteUrl,
        nexusPageSlug: integrations.nexusPageSlug,
        socialAccounts: integrations.socialAccounts,
      });
      toast.success('Channels and website links saved');
      await loadIntegrations();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (!workspaceId) {
    return null;
  }

  if (loading || !integrations) {
    return <p className="text-gray-500">Loading workspace settings…</p>;
  }

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Settings className="w-7 h-7 text-indigo-500" />
          <h1 className="text-3xl font-bold text-gray-900">Workspace Settings</h1>
        </div>
        <p className="text-gray-600 max-w-2xl">
          Connect social accounts for publishing, link your website and Nexus Page, and configure
          channels where the AI agent replies to client messages.
        </p>
      </div>

      {/* Website & Nexus Page */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="w-5 h-5 text-indigo-500" />
          <h2 className="text-lg font-semibold text-gray-900">Website &amp; Nexus Page</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Used for link-in-bio pages, brand context in AI replies, and post CTAs.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="website-url" className="block text-sm font-medium text-gray-700 mb-1">
              Company website
            </label>
            <input
              id="website-url"
              type="url"
              value={integrations.websiteUrl}
              onChange={(e) => setIntegrations({ ...integrations, websiteUrl: e.target.value })}
              placeholder="https://nexussocial.com"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div>
            <label htmlFor="nexus-slug" className="block text-sm font-medium text-gray-700 mb-1">
              Nexus Page slug
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400 shrink-0">/p/</span>
              <input
                id="nexus-slug"
                type="text"
                value={integrations.nexusPageSlug}
                onChange={(e) => setIntegrations({ ...integrations, nexusPageSlug: e.target.value })}
                placeholder="your-brand"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            {integrations.nexusPageSlug && (
              <Link
                href={`/p/${integrations.nexusPageSlug}`}
                className="mt-1 inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline"
                target="_blank"
              >
                <Link2 className="w-3 h-3" />
                Preview Nexus Page
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Publishing channels */}
      <section id="nav-settings-channels" className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Publishing channels</h2>
        <p className="text-sm text-gray-500 mb-5">
          Connect accounts via OAuth for real publishing. Manual handles remain for display-only networks.
        </p>

        {(integrations.metaAppReviewStatus !== 'approved') && (
          <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <p className="font-medium">Meta App Review: {metaAppReviewUtils.statusLabel(integrations.metaAppReviewStatus)}</p>
            <p className="mt-1 text-amber-900">
              Facebook and Instagram publishing stays blocked until an admin sets workspace status to approved after Meta business review.
            </p>
          </div>
        )}

        <div className="space-y-4">
          {PLATFORMS.map((platform) => {
            const account = integrations.socialAccounts[platform];
            const meta = SOCIAL_META[platform];
            const oauthPath = workspaceId ? oauthReconnectPath({ platform, workspaceId }) : null;
            const usesOAuth = OAUTH_PLATFORMS.includes(platform);

            return (
              <div
                key={platform}
                className="rounded-lg border border-gray-100 bg-gray-50/80 p-4 grid gap-3 md:grid-cols-[140px_1fr_1fr_auto]"
              >
                <div className="flex items-center gap-2 font-medium text-gray-900">
                  {meta.icon}
                  {platform}
                </div>
                <input
                  type="text"
                  value={account.handle}
                  onChange={(e) => updateSocial(platform, 'handle', e.target.value)}
                  placeholder={meta.placeholder}
                  aria-label={`${platform} handle`}
                  readOnly={usesOAuth && account.connected}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 read-only:bg-gray-100"
                />
                <input
                  type="url"
                  value={account.profileUrl}
                  onChange={(e) => updateSocial(platform, 'profileUrl', e.target.value)}
                  placeholder={meta.urlPlaceholder}
                  aria-label={`${platform} profile URL`}
                  readOnly={usesOAuth && account.connected}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 read-only:bg-gray-100"
                />
                <div className="flex flex-col items-end gap-2 self-center">
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${
                      account.connected
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {account.connected ? 'OAuth connected' : 'Not connected'}
                  </span>
                  {usesOAuth && oauthPath && !account.connected && (
                    <a
                      href={oauthPath}
                      className="text-xs font-medium text-indigo-600 hover:underline"
                    >
                      Connect OAuth
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* AI agent / messaging */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Bot className="w-5 h-5 text-indigo-500" />
          <h2 className="text-lg font-semibold text-gray-900">Client messaging &amp; AI agent</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Connect WhatsApp or SMS inboxes via Chatwoot. The AI agent uses these channels to reply to
          customer inquiries in the Unified Inbox.
        </p>

        <div className="flex flex-wrap gap-3 mb-4">
          <button
            type="button"
            onClick={() => setChannelDialogOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition"
          >
            <Phone className="w-4 h-4" />
            Connect WhatsApp / SMS
          </button>
          <Link
            href="/settings/ai-agent"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            <Bot className="w-4 h-4" />
            AI agent controls
          </Link>
          <Link
            href="/inbox"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            Open Unified Inbox
          </Link>
        </div>

        {integrations.messagingChannels.length > 0 ? (
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100">
            {integrations.messagingChannels.map((ch) => (
              <li key={ch.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="font-medium text-gray-900 capitalize">
                  {ch.channel_type} · {ch.phone_number}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    ch.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {ch.is_active ? 'Active' : 'Inactive'}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-400">No messaging channels connected yet.</p>
        )}

        <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-500">
          <span>
            Chatwoot:{' '}
            <strong className={integrations.integrations.chatwoot ? 'text-green-600' : 'text-amber-600'}>
              {integrations.integrations.chatwoot ? 'Configured' : 'Not configured'}
            </strong>
          </span>
          <span>
            Dify AI:{' '}
            <strong className={integrations.integrations.dify ? 'text-green-600' : 'text-amber-600'}>
              {integrations.integrations.dify ? 'Configured' : 'Not configured'}
            </strong>
          </span>
        </div>
      </section>

      <HubSpotIntegrationStub />

      {/* More settings */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Account &amp; admin</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/settings/profile" className="text-sm text-indigo-600 hover:underline">
            Profile
          </Link>
          <Link href="/settings/security" className="text-sm text-indigo-600 hover:underline">
            Security
          </Link>
          <Link href="/settings/preferences" className="text-sm text-indigo-600 hover:underline">
            Preferences
          </Link>
          <Link href="/settings/team" className="text-sm text-indigo-600 hover:underline">
            Team
          </Link>
          <Link href="/admin" className="text-sm text-indigo-600 hover:underline">
            Admin console
          </Link>
          <Link href="/settings/sso" className="text-sm text-indigo-600 hover:underline">
            SSO / SAML
          </Link>
          <Link href="/settings/migration" className="text-sm text-indigo-600 hover:underline">
            Data migration
          </Link>
        </div>
      </section>

      <div className="flex justify-end pb-8">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition"
        >
          {saving ? 'Saving…' : 'Save all connections'}
        </button>
      </div>

      <ConnectChannelDialog
        isOpen={channelDialogOpen}
        onClose={() => {
          setChannelDialogOpen(false);
          loadIntegrations();
        }}
      />
    </div>
  );
}
