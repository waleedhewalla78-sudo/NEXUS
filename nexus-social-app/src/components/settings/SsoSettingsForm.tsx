'use client';

import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useWorkspaceStore } from '@/store/workspace';
import { getSsoConfig, saveSsoConfig, type SsoConfig } from '@/actions/sso-settings';

const emptyConfig: SsoConfig = {
  provider: 'saml',
  oauth_client_id: '',
  oauth_client_secret: '',
  metadata_url: '',
  is_enabled: false,
};

export default function SsoSettingsForm() {
  const workspaceId = useWorkspaceStore((s) => s.workspaceId);
  const [config, setConfig] = useState<SsoConfig>(emptyConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const samlEnvEnabled = process.env.NEXT_PUBLIC_SAML_ENABLED === 'true';

  useEffect(() => {
    if (!workspaceId) return;
    getSsoConfig(workspaceId)
      .then((data) => setConfig(data ?? emptyConfig))
      .catch(() => setConfig(emptyConfig))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId) return;
    setSaving(true);
    try {
      await saveSsoConfig(workspaceId, config);
      toast.success('SSO configuration saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (!workspaceId) return null;
  if (loading) return <p className="text-gray-500">Loading SSO settings…</p>;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg border border-gray-200 bg-white p-6 space-y-4">
        <p className="text-sm text-gray-700">
          Platform SAML flag:{' '}
          <span className={samlEnvEnabled ? 'text-green-700 font-medium' : 'text-amber-700 font-medium'}>
            {samlEnvEnabled ? 'SAML enabled in environment' : 'SAML not enabled in environment'}
          </span>
        </p>

        <div>
          <label htmlFor="sso-provider" className="block text-sm font-medium text-gray-700 mb-1">
            Provider type
          </label>
          <select
            id="sso-provider"
            value={config.provider}
            onChange={(e) =>
              setConfig((c) => ({ ...c, provider: e.target.value as SsoConfig['provider'] }))
            }
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="saml">SAML 2.0</option>
            <option value="oauth">OAuth 2.0</option>
          </select>
        </div>

        <div>
          <label htmlFor="metadata-url" className="block text-sm font-medium text-gray-700 mb-1">
            IdP metadata URL
          </label>
          <input
            id="metadata-url"
            type="url"
            value={config.metadata_url}
            onChange={(e) => setConfig((c) => ({ ...c, metadata_url: e.target.value }))}
            placeholder="https://idp.example.com/metadata"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label htmlFor="oauth-client-id" className="block text-sm font-medium text-gray-700 mb-1">
            OAuth client ID
          </label>
          <input
            id="oauth-client-id"
            type="text"
            value={config.oauth_client_id}
            onChange={(e) => setConfig((c) => ({ ...c, oauth_client_id: e.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label htmlFor="oauth-client-secret" className="block text-sm font-medium text-gray-700 mb-1">
            OAuth client secret
          </label>
          <input
            id="oauth-client-secret"
            type="password"
            value={config.oauth_client_secret}
            onChange={(e) => setConfig((c) => ({ ...c, oauth_client_secret: e.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={config.is_enabled}
            onChange={(e) => setConfig((c) => ({ ...c, is_enabled: e.target.checked }))}
            className="rounded border-gray-300"
          />
          Enable SSO for this workspace
        </label>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save SSO configuration'}
      </button>
    </form>
  );
}
