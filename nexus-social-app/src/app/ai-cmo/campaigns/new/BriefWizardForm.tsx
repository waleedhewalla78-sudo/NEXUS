'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { campaignBriefPresets } from '@/lib/ai-cmo/campaign-brief/schema';
import {
  pollCampaignJobFromSession,
  submitCampaignBriefFromSession,
} from '@/actions/campaign-brief-ui';
import { getTargetAccountById, listTargetAccounts } from '@/actions/abm';
import {
  intentLevelBadgeClass,
  intentLevelLabel,
} from '@/lib/ai-cmo/abm/target-account-prompt';
import type { TargetAccount } from '@/types/abm';

type FormState = {
  role: string;
  seniority: 'Junior' | 'Mid' | 'Senior' | 'Lead' | 'Executive';
  domain: string;
  context: string;
  coreObjective: string;
  secondary1: string;
  secondary2: string;
  secondary3: string;
  targetRole: string;
  experienceLevel: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  market: string;
  artifactType: string;
  locale: string;
  targetAccountId: string;
  targetAccountQuery: string;
};

const initialForm: FormState = {
  role: campaignBriefPresets.roles[2],
  seniority: 'Senior',
  domain: campaignBriefPresets.domains[3],
  context: '',
  coreObjective: '',
  secondary1: '',
  secondary2: '',
  secondary3: '',
  targetRole: campaignBriefPresets.targetRoles[0],
  experienceLevel: 'Intermediate',
  market: campaignBriefPresets.markets[0],
  artifactType: campaignBriefPresets.artifactTypes[4],
  locale: 'en-US',
  targetAccountId: '',
  targetAccountQuery: '',
};

export function BriefWizardForm() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [accountOptions, setAccountOptions] = useState<TargetAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<TargetAccount | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [campaignId, setCampaignId] = useState<string | null>(null);

  useEffect(() => {
    listTargetAccounts().then(setAccountOptions).catch(() => setAccountOptions([]));
  }, []);

  useEffect(() => {
    if (!form.targetAccountId) {
      setSelectedAccount(null);
      return;
    }
    getTargetAccountById(form.targetAccountId)
      .then(setSelectedAccount)
      .catch(() => setSelectedAccount(null));
  }, [form.targetAccountId]);

  const filteredAccounts = accountOptions.filter((account) => {
    const q = form.targetAccountQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      account.name.toLowerCase().includes(q) ||
      account.domain.toLowerCase().includes(q) ||
      account.topics.some((t) => t.toLowerCase().includes(q))
    );
  });

  const poll = useCallback(async (id: string) => {
    const result = await pollCampaignJobFromSession(id);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setJobStatus(result.status);
    if (result.campaignId) setCampaignId(result.campaignId);
    if (result.error) setError(result.error);
  }, []);

  useEffect(() => {
    if (!jobId || jobStatus === 'completed' || jobStatus === 'failed') return;
    const timer = setInterval(() => poll(jobId), 4000);
    return () => clearInterval(timer);
  }, [jobId, jobStatus, poll]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setJobId(null);
    setJobStatus(null);
    setCampaignId(null);

    const secondaries = [form.secondary1, form.secondary2, form.secondary3].filter(Boolean);
    const result = await submitCampaignBriefFromSession({
      role: form.role,
      seniority: form.seniority,
      domain: form.domain,
      context: form.context,
      coreObjective: form.coreObjective,
      secondaryObjectives: [
        secondaries[0],
        secondaries[1],
        secondaries[2],
      ] as [string?, string?, string?],
      targetRole: form.targetRole,
      experienceLevel: form.experienceLevel,
      market: form.market,
      artifactType: form.artifactType,
      locale: form.locale,
      ...(form.targetAccountId ? { targetAccountId: form.targetAccountId } : {}),
    });

    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setJobId(result.jobId);
    setPreview(result.assembledObjectivePreview);
    setJobStatus('processing');
    void poll(result.jobId);
  }

  function field<K extends keyof FormState>(key: K, label: string, opts?: { textarea?: boolean; rows?: number }) {
    const value = form[key];
    const onChange = (v: string) => setForm((f) => ({ ...f, [key]: v }));
    return (
      <label className="block">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        {opts?.textarea ? (
          <textarea
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            rows={opts.rows ?? 4}
            value={value as string}
            onChange={(e) => onChange(e.target.value)}
            required={key === 'context' || key === 'coreObjective'}
          />
        ) : (
          <input
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            value={value as string}
            onChange={(e) => onChange(e.target.value)}
            required={['role', 'domain', 'coreObjective', 'targetRole', 'market', 'artifactType'].includes(key)}
          />
        )}
      </label>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-4 space-y-3">
        <label className="block">
          <span className="text-sm font-medium text-gray-800">Target Account (Optional)</span>
          <input
            type="search"
            placeholder="Search accounts (e.g. Vodafone, Cairo Bank)…"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
            value={form.targetAccountQuery}
            onChange={(e) => setForm((f) => ({ ...f, targetAccountQuery: e.target.value }))}
          />
        </label>
        <select
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
          value={form.targetAccountId}
          onChange={(e) => setForm((f) => ({ ...f, targetAccountId: e.target.value }))}
        >
          <option value="">— No target account —</option>
          {filteredAccounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name} · {account.intentScore}/100 · {account.buyerStage}
            </option>
          ))}
        </select>
        {selectedAccount && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium text-gray-800">{selectedAccount.name}</span>
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${intentLevelBadgeClass(selectedAccount.intentScore)}`}
            >
              [{intentLevelLabel(selectedAccount.intentScore)}]
            </span>
            <span className="text-gray-500 capitalize">Stage: {selectedAccount.buyerStage}</span>
          </div>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Role</span>
          <select
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
          >
            {campaignBriefPresets.roles.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Seniority</span>
          <select
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            value={form.seniority}
            onChange={(e) => setForm((f) => ({ ...f, seniority: e.target.value as FormState['seniority'] }))}
          >
            {(['Junior', 'Mid', 'Senior', 'Lead', 'Executive'] as const).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        {field('domain', 'Domain')}
        {field('market', 'Market')}
        {field('targetRole', 'Target role')}
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Experience level</span>
          <select
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            value={form.experienceLevel}
            onChange={(e) => setForm((f) => ({ ...f, experienceLevel: e.target.value as FormState['experienceLevel'] }))}
          >
            {(['Beginner', 'Intermediate', 'Advanced', 'Expert'] as const).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        {field('artifactType', 'Artifact type')}
      </div>

      {field('context', 'Business context', { textarea: true, rows: 5 })}
      {field('coreObjective', 'Core objective', { textarea: true, rows: 2 })}
      {field('secondary1', 'Secondary objective 1 (optional)')}
      {field('secondary2', 'Secondary objective 2 (optional)')}
      {field('secondary3', 'Secondary objective 3 (optional)')}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
      >
        {submitting ? 'Enqueueing…' : 'Launch AI CMO Campaign'}
      </button>

      {preview && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Objective preview</p>
          <pre className="mt-2 whitespace-pre-wrap text-xs text-gray-700">{preview}</pre>
        </div>
      )}

      {jobId && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm">
          <p><strong>Job:</strong> {jobId}</p>
          <p><strong>Status:</strong> {jobStatus ?? '…'}</p>
          {campaignId && (
            <p className="mt-2">
              Campaign created —{' '}
              <Link href="/ai-ops" className="text-indigo-700 underline">view AI Ops</Link>
            </p>
          )}
        </div>
      )}
    </form>
  );
}
