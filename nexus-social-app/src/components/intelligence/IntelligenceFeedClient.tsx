'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Copy, Sparkles, Upload } from 'lucide-react';

type FeedItem =
  | { kind: 'brief'; id: string; created_at: string; brief_text: string; status: string }
  | {
      kind: 'ingest';
      id: string;
      created_at: string;
      source: string;
      row_count: number;
      brief_status: string;
      anomalies: Array<{ metric?: string; message?: string }>;
    };

function sourceBadge(source: string): string {
  if (source === 'ga4') return 'bg-blue-100 text-blue-800';
  if (source === 'meta_ads') return 'bg-sky-100 text-sky-900';
  if (source === 'manual_csv') return 'bg-slate-100 text-slate-800';
  return 'bg-gray-100 text-gray-700';
}

function sourceLabel(source: string): string {
  if (source === 'ga4') return 'GA4';
  if (source === 'meta_ads') return 'Meta Ads';
  if (source === 'manual_csv') return 'CSV';
  return source;
}

export default function IntelligenceFeedClient() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [briefing, setBriefing] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', new Date(from).toISOString());
      if (to) params.set('to', new Date(`${to}T23:59:59`).toISOString());
      const res = await fetch(`/api/v1/intelligence/feed?${params.toString()}`);
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(json.error ?? `Failed to load feed (${res.status})`);
      }
      const json = (await res.json()) as { items: FeedItem[]; webhookUrl?: string };
      setItems(json.items ?? []);
      setWebhookUrl(json.webhookUrl ?? '');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load intelligence feed');
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onUpload(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.set('file', file);
      form.set('source', 'manual_csv');
      const res = await fetch('/api/v1/intelligence/ingest', { method: 'POST', body: form });
      const json = (await res.json()) as { error?: string; anomalies?: unknown[] };
      if (!res.ok) throw new Error(json.error ?? 'Upload failed');
      toast.success('Data ingested');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function generateBrief() {
    setBriefing(true);
    try {
      const res = await fetch('/api/v1/intelligence/brief', { method: 'POST' });
      const json = (await res.json()) as { error?: string; briefsCreated?: number };
      if (!res.ok) throw new Error(json.error ?? 'Briefing failed');
      toast.success(
        json.briefsCreated
          ? 'Executive brief ready'
          : 'No pending ingests to brief',
      );
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Briefing failed');
    } finally {
      setBriefing(false);
    }
  }

  function copyBrief(text: string) {
    void navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  }

  function copyWebhook() {
    if (!webhookUrl) return;
    void navigator.clipboard.writeText(webhookUrl);
    toast.success('Webhook URL copied');
  }

  const hasPending = items.some(
    (i) => i.kind === 'ingest' && i.brief_status === 'pending',
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Intelligence</h1>
          <p className="mt-1 text-sm text-slate-600">
            Agency command feed — ingest client exports, generate CMO briefs.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={copyWebhook}
            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Copy webhook URL
          </button>
          <button
            type="button"
            disabled={briefing || !hasPending}
            onClick={() => void generateBrief()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-violet-300 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-900 hover:bg-violet-100 disabled:opacity-50"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {briefing ? 'Analyzing…' : 'Ask AI to Analyze'}
          </button>
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-900 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
          >
            <Upload className="h-3.5 w-3.5" />
            {uploading ? 'Uploading…' : 'Upload CSV'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onUpload(file);
            }}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-3">
        <div>
          <label className="block text-xs font-medium text-slate-600">Start date</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1 rounded border border-slate-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">End date</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1 rounded border border-slate-300 px-2 py-1.5 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
        >
          Apply
        </button>
      </div>

      {loading && <p className="text-sm text-slate-500">Loading feed…</p>}

      {!loading && items.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center">
          <p className="text-sm font-medium text-slate-800">
            Connect your first data source to activate the AI Intelligence feed.
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Upload a GA4/Meta CSV export, or forward Meta Lead Ads to the webhook URL.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {items.map((item) =>
          item.kind === 'brief' ? (
            <article
              key={`brief-${item.id}`}
              className="rounded-2xl border border-violet-200 bg-gradient-to-b from-white to-violet-50/40 p-5 shadow-sm"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="inline-flex rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-900">
                  AI Generated
                </span>
                <button
                  type="button"
                  onClick={() => copyBrief(item.brief_text)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-violet-800 hover:underline"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy to Clipboard
                </button>
              </div>
              <div className="font-serif text-[15px] leading-relaxed text-slate-900 whitespace-pre-wrap">
                {item.brief_text}
              </div>
              <p className="mt-3 text-xs text-slate-500">
                {new Date(item.created_at).toLocaleString()}
              </p>
            </article>
          ) : (
            <article
              key={`ingest-${item.id}`}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${sourceBadge(item.source)}`}
                >
                  {sourceLabel(item.source)}
                </span>
                <span className="text-xs text-slate-500">{item.row_count} rows</span>
                <span className="text-xs text-slate-500">· {item.brief_status}</span>
              </div>
              {item.anomalies?.length > 0 && (
                <ul className="mb-2 space-y-1">
                  {item.anomalies.map((a, idx) => (
                    <li key={idx} className="text-xs font-medium text-red-700">
                      {a.message ?? a.metric}
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-sm text-slate-700">Raw metrics ingested and queued for briefing.</p>
              <p className="mt-2 text-xs text-slate-500">
                {new Date(item.created_at).toLocaleString()}
              </p>
            </article>
          ),
        )}
      </div>
    </div>
  );
}
