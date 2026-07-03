'use client';

import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Link2 } from 'lucide-react';
import {
  getHubSpotIntegrationStub,
  saveHubSpotPortalId,
} from '@/actions/hubspot-integration';

export function HubSpotIntegrationStub() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [portalId, setPortalId] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');

  useEffect(() => {
    getHubSpotIntegrationStub()
      .then((data) => {
        setPortalId(data.portalId);
        setWebhookUrl(data.webhookUrl);
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

  if (loading) return null;

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm mt-6">
      <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
        <Link2 className="h-5 w-5 text-orange-500" />
        HubSpot CRM (stub)
      </h2>
      <p className="text-sm text-gray-600 mt-1 mb-4">
        Webhook ingest is live. Full OAuth connection UI ships in a later sprint — configure your
        HubSpot app webhook to the URL below.
      </p>
      <div className="space-y-3">
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
            value={webhookUrl}
            className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-mono"
          />
        </div>
        <span className="inline-block text-xs font-medium px-2 py-1 rounded-full bg-amber-100 text-amber-800">
          OAuth — coming soon
        </span>
      </div>
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="mt-4 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save portal ID'}
      </button>
    </section>
  );
}
