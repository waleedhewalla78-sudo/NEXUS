'use client';

import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Link2 } from 'lucide-react';
import {
  disconnectHubSpotOAuth,
  getHubSpotIntegrationStatus,
  saveHubSpotPortalId,
  type HubSpotIntegrationStatus,
} from '@/actions/hubspot-integration';

export function HubSpotIntegrationStub() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [status, setStatus] = useState<HubSpotIntegrationStatus | null>(null);
  const [portalId, setPortalId] = useState('');

  useEffect(() => {
    getHubSpotIntegrationStatus()
      .then((data) => {
        setStatus(data);
        setPortalId(data.portalId);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Failed to load HubSpot settings'))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    const result = await saveHubSpotPortalId(portalId);
    setSaving(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success('HubSpot portal ID saved');
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    const result = await disconnectHubSpotOAuth();
    setDisconnecting(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success('HubSpot OAuth disconnected');
    const refreshed = await getHubSpotIntegrationStatus();
    setStatus(refreshed);
  }

  if (loading || !status) return null;

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm mt-6">
      <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
        <Link2 className="h-5 w-5 text-orange-500" />
        HubSpot CRM
      </h2>
      <p className="text-sm text-gray-600 mt-1 mb-4">
        Connect via OAuth for live deal sync, or configure the inbound webhook URL in your HubSpot
        app.
      </p>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-block text-xs font-medium px-2 py-1 rounded-full ${
              status.oauthStatus === 'connected'
                ? 'bg-green-100 text-green-800'
                : status.oauthStatus === 'private_app'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-amber-100 text-amber-800'
            }`}
          >
            {status.oauthStatus === 'connected'
              ? 'OAuth connected'
              : status.oauthStatus === 'private_app'
                ? 'Private app token (env)'
                : 'Not connected'}
          </span>
          {status.hubDomain ? (
            <span className="text-xs text-gray-500">{status.hubDomain}</span>
          ) : null}
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Portal ID</label>
          <input
            type="text"
            value={portalId}
            onChange={(e) => setPortalId(e.target.value)}
            placeholder="12345678"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Inbound webhook URL</label>
          <input
            type="text"
            readOnly
            value={status.webhookUrl}
            className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-mono"
          />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={status.connectUrl}
          className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
        >
          Connect HubSpot OAuth
        </a>
        {status.oauthStatus === 'connected' ? (
          <button
            type="button"
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {disconnecting ? 'Disconnecting…' : 'Disconnect OAuth'}
          </button>
        ) : null}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save portal ID'}
        </button>
      </div>
    </section>
  );
}

/** Alias for settings hub import clarity. */
export const HubSpotIntegrationSettings = HubSpotIntegrationStub;
