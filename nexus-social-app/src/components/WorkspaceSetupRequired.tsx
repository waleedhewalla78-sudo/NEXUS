'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, Copy, Database, ExternalLink } from 'lucide-react';
import { useWorkspaceStore } from '@/store/workspace';

function getSupabaseSqlEditorUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
  if (!match) return null;
  return `https://supabase.com/dashboard/project/${match[1]}/sql/new`;
}

export function isDatabaseSetupError(message: string | null | undefined): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes('database tables missing') ||
    lower.includes('schema out of date') ||
    lower.includes('error 42703') ||
    lower.includes('schema_patch.sql') ||
    lower.includes('essential_bootstrap.sql') ||
    lower.includes('could not find the table') ||
    lower.includes('schema cache') ||
    (lower.includes('relation') && lower.includes('does not exist'))
  );
}

interface WorkspaceSetupRequiredProps {
  bootstrapSql?: string;
}

export default function WorkspaceSetupRequired({ bootstrapSql: bootstrapSqlProp = '' }: WorkspaceSetupRequiredProps) {
  const setupError = useWorkspaceStore((s) => s.setupError);
  const [copied, setCopied] = useState(false);
  const [bootstrapSql, setBootstrapSql] = useState(bootstrapSqlProp);
  const sqlEditorUrl = getSupabaseSqlEditorUrl();

  useEffect(() => {
    if (bootstrapSqlProp) {
      setBootstrapSql(bootstrapSqlProp);
      return;
    }
    fetch('/api/setup/sql')
      .then((r) => r.text())
      .then(setBootstrapSql)
      .catch(() => setBootstrapSql(''));
  }, [bootstrapSqlProp]);

  const handleCopy = async () => {
    if (!bootstrapSql) return;
    await navigator.clipboard.writeText(bootstrapSql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto mt-6 rounded-xl border border-amber-300 bg-amber-50 p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="rounded-lg bg-amber-100 p-3 shrink-0">
          <Database className="w-6 h-6 text-amber-700" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Database setup required (one-time)</h2>
          <p className="text-sm text-gray-700 mb-3">
            Supabase is connected, but the <code className="text-xs bg-white px-1 rounded">workspace_members</code>{' '}
            table does not exist yet. Settings, AI Agent, Calendar, and Inbox all need this before they can load.
          </p>

          {setupError && (
            <p className="text-xs font-mono text-amber-900 bg-amber-100/80 rounded px-3 py-2 mb-4 break-all">
              {setupError}
            </p>
          )}

          <ol className="list-decimal list-inside text-sm text-gray-800 space-y-2 mb-4">
            <li>
              Open Supabase SQL Editor
              {sqlEditorUrl && (
                <>
                  {' '}
                  <a
                    href={sqlEditorUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-indigo-600 hover:underline font-medium"
                  >
                    (open now)
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </>
              )}
            </li>
            <li>Paste the SQL below and click <strong>Run</strong></li>
            <li>Hard-refresh this app (Ctrl+Shift+R) — your workspace will appear automatically</li>
          </ol>

          {bootstrapSql && (
            <div className="relative mb-4">
              <button
                type="button"
                onClick={handleCopy}
                className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-md bg-white border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                {copied ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied' : 'Copy SQL'}
              </button>
              <pre className="max-h-64 overflow-auto rounded-lg border border-gray-200 bg-white p-4 text-xs text-gray-800">
                {bootstrapSql}
              </pre>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            {sqlEditorUrl && (
              <a
                href={sqlEditorUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
              >
                Open Supabase SQL Editor
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
            <Link
              href="/setup"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Full setup instructions
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
