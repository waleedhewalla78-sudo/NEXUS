'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { TargetAccount } from '@/types/abm';
import { ExplainabilityPanel } from '@/components/abm/ExplainabilityPanel';
import { IntentScoreBadge, funnelStageBadge } from '@/components/ai-cmo/IntentScoreBadge';
import { Building2, Target } from 'lucide-react';

function funnelFromStage(stage: TargetAccount['buyerStage']): 'BOFU' | 'MOFU' | 'TOFU' {
  if (stage === 'decision') return 'BOFU';
  if (stage === 'consideration') return 'MOFU';
  return 'TOFU';
}

type Props = {
  accounts: TargetAccount[];
};

export function AbmStaticClient({ accounts }: Props) {
  const t = useTranslations('Abm');
  const tNav = useTranslations('Nav');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const highIntent = accounts.filter((a) => a.intentScore >= 70).length;
  const avgScore = accounts.length
    ? Math.round(accounts.reduce((s, a) => s + a.intentScore, 0) / accounts.length)
    : 0;

  return (
    <div className="space-y-8">
      <div className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900">
        {t('mockBadge')}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500 flex items-center gap-1">
            <Target className="h-4 w-4" /> {t('targetAccounts')}
          </p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{accounts.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">{t('highIntent')}</p>
          <p className="text-3xl font-bold text-rose-600 mt-1">{highIntent}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">{t('avgIntentScore')}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{avgScore}</p>
        </div>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-indigo-500" />
            {t('accountList')}
          </h2>
          <Link href="/ai-cmo/attribution" className="text-sm text-indigo-600 hover:underline">
            {tNav('attribution')} →
          </Link>
        </div>
        <ul className="divide-y divide-gray-100">
          {accounts.map((account) => {
            const funnel = funnelFromStage(account.buyerStage);
            const topicLabel = account.topics.join(', ');
            const isExpanded = expandedId === account.id;
            return (
              <li key={account.id} className="px-6 py-4 hover:bg-gray-50/80">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-gray-900">{account.name}</p>
                      <IntentScoreBadge score={account.intentScore} topic={topicLabel} />
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${funnelStageBadge(funnel)}`}
                      >
                        {funnel}
                      </span>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 capitalize">
                        {account.buyerStage}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">{account.domain}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {t('industry')}: {account.industry ?? '—'} · {t('topics')}:{' '}
                      <span className="font-medium">{topicLabel}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : account.id)}
                    className="text-xs text-indigo-600 hover:underline font-medium"
                  >
                    {isExpanded ? t('hide') : t('why')}
                  </button>
                </div>
                {isExpanded && (
                  <div className="mt-4 max-w-lg">
                    <ExplainabilityPanel account={account} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
