'use client';

import { useEffect, useState } from 'react';
import { useWorkspaceStore } from '@/store/workspace';
import { AiVerifyBanner } from '@/components/ai/AiVerifyBanner';
import {
  getAiAgentConfig,
  updateAiAgentConfig,
  testAiAgentConnection,
  type AiAgentConfig,
} from '@/actions/ai-agent-settings';
import { toast } from 'react-hot-toast';

export default function AiAgentSettingsPage() {
  const workspaceId = useWorkspaceStore((s) => s.workspaceId);
  const [config, setConfig] = useState<AiAgentConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (!workspaceId) return;

    getAiAgentConfig(workspaceId)
      .then(setConfig)
      .catch((err: Error) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  const handleSave = async () => {
    if (!workspaceId || !config) return;
    setSaving(true);
    try {
      await updateAiAgentConfig(workspaceId, config);
      toast.success('AI agent settings saved');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!workspaceId) return;
    setTesting(true);
    try {
      if (config) await updateAiAgentConfig(workspaceId, config);
      const result = await testAiAgentConnection(workspaceId);
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Test failed');
    } finally {
      setTesting(false);
    }
  };

  if (!workspaceId) {
    return <p className="text-gray-600">Select a workspace to manage AI agent settings.</p>;
  }

  if (loading) {
    return <p className="text-gray-600">Loading AI agent configuration…</p>;
  }

  if (!config) {
    return (
      <div className="max-w-2xl space-y-4">
        <p className="text-gray-600">No AI agent configuration found for this workspace.</p>
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-medium mb-2">Setup checklist</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>
              Run <code className="text-xs bg-white px-1 rounded">src/sql/schema_patch.sql</code> in Supabase SQL
              Editor (includes <code className="text-xs">NOTIFY pgrst, &apos;reload schema&apos;</code>)
            </li>
            <li>
              Add <code className="text-xs">DIFY_API_KEY=app-...</code> to <code className="text-xs">.env.local</code>{' '}
              and restart dev server
            </li>
            <li>
              Run <code className="text-xs bg-white px-1 rounded">npm run ai:setup</code>
            </li>
            <li>Open this page again and click <strong>Test Dify connection</strong></li>
          </ol>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-8">
      <AiVerifyBanner />
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">AI Agent Controls</h1>
        <p className="text-gray-600">
          Connect Dify for inbox auto-replies and caption generation. Use{' '}
          <strong>API Access → App API Key</strong> from your Dify app (not the dataset key).
        </p>
      </div>

      <div className="space-y-4 bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900">Dify connection</h2>

        {!config.dify_app_api_key && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="alert">
            <strong>API key required.</strong> Paste your Dify <em>App API Key</em> (starts with{' '}
            <code className="text-xs">app-</code>) below, or add{' '}
            <code className="text-xs">DIFY_API_KEY=app-...</code> to <code className="text-xs">.env.local</code>{' '}
            and restart the dev server. Get it from Dify Cloud → your app → API Access.
          </div>
        )}

        {config.is_globally_disabled && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
            Global kill switch is <strong>ON</strong> — inbox messages will not get AI replies until you turn it off.
          </div>
        )}

        {!config.is_active && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="alert">
            AI agent is <strong>inactive</strong> — enable it under Runtime controls below.
          </div>
        )}

        <div>
          <label htmlFor="persona-name" className="block text-sm font-medium text-gray-700 mb-1">
            Persona name
          </label>
          <input
            id="persona-name"
            type="text"
            value={config.persona_name}
            onChange={(e) => setConfig({ ...config, persona_name: e.target.value })}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label htmlFor="dify-app-id" className="block text-sm font-medium text-gray-700 mb-1">
            Dify app ID
          </label>
          <input
            id="dify-app-id"
            type="text"
            value={config.dify_app_id}
            onChange={(e) => setConfig({ ...config, dify_app_id: e.target.value })}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm font-mono text-xs"
            placeholder="From Dify app URL or API"
          />
        </div>

        <div>
          <label htmlFor="dify-dataset-id" className="block text-sm font-medium text-gray-700 mb-1">
            Dify dataset ID (RAG knowledge base)
          </label>
          <input
            id="dify-dataset-id"
            type="text"
            value={config.dify_dataset_id}
            onChange={(e) => setConfig({ ...config, dify_dataset_id: e.target.value })}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm font-mono text-xs"
          />
        </div>

        <div>
          <label htmlFor="dify-app-api-key" className="block text-sm font-medium text-gray-700 mb-1">
            Dify app API key
          </label>
          <input
            id="dify-app-api-key"
            type="password"
            value={config.dify_app_api_key}
            onChange={(e) => setConfig({ ...config, dify_app_api_key: e.target.value })}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm font-mono text-xs"
            placeholder="app-xxxxxxxxxxxxxxxx"
            autoComplete="off"
          />
          <p className="text-xs text-gray-500 mt-1">
            Server fallback: <code>DIFY_API_KEY</code> in .env.local if this field is empty.
          </p>
        </div>

        <button
          type="button"
          onClick={handleTest}
          disabled={testing}
          className="rounded border border-indigo-600 px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 disabled:opacity-50"
        >
          {testing ? 'Testing…' : 'Test Dify connection'}
        </button>
      </div>

      <div className="space-y-6 bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900">Runtime controls</h2>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={config.is_globally_disabled}
            onChange={(e) => setConfig({ ...config, is_globally_disabled: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300"
          />
          <span className="font-medium text-gray-900">Global kill switch (route all traffic to humans)</span>
        </label>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={config.is_active}
            onChange={(e) => setConfig({ ...config, is_active: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300"
          />
          <span className="font-medium text-gray-900">AI agent active</span>
        </label>

        <div>
          <label htmlFor="traffic-allocation" className="block text-sm font-medium text-gray-700 mb-1">
            Canary traffic allocation ({config.traffic_allocation_percentage}%)
          </label>
          <input
            id="traffic-allocation"
            type="range"
            min={0}
            max={100}
            value={config.traffic_allocation_percentage}
            onChange={(e) =>
              setConfig({ ...config, traffic_allocation_percentage: Number(e.target.value) })
            }
            className="w-full"
          />
        </div>

        <div>
          <label htmlFor="daily-token-limit" className="block text-sm font-medium text-gray-700 mb-1">
            Daily token limit
          </label>
          <input
            id="daily-token-limit"
            type="number"
            min={0}
            value={config.daily_token_limit ?? ''}
            onChange={(e) =>
              setConfig({
                ...config,
                daily_token_limit: e.target.value ? Number(e.target.value) : null,
              })
            }
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            placeholder="Leave empty for no limit"
          />
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </div>
    </div>
  );
}
