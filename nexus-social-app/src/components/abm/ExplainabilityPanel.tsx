'use client';

import type { TargetAccount } from '@/types/abm';

type Props = {
  account: TargetAccount;
  className?: string;
};

const STAGE_LABELS: Record<TargetAccount['buyerStage'], string> = {
  awareness: 'Awareness',
  consideration: 'Consideration',
  decision: 'Decision',
};

function scoreBand(score: number): 'high' | 'medium' | 'low' {
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

function whyThisScore(account: TargetAccount): string {
  const band = scoreBand(account.intentScore);
  const topicList = account.topics.length ? account.topics.map((t) => `'${t}'`).join(', ') : 'general intent signals';

  if (band === 'high') {
    return `Score is high because they are actively searching for ${topicList}.`;
  }
  if (band === 'medium') {
    return `Score is moderate — showing interest in ${topicList}.`;
  }
  return `Score is nurture-stage — early signals around ${topicList}.`;
}

function buyerStageLine(account: TargetAccount): string {
  const label = STAGE_LABELS[account.buyerStage];
  return `Currently in the '${label}' phase.`;
}

export function ExplainabilityPanel({ account, className = '' }: Props) {
  return (
    <aside
      className={`rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-5 shadow-sm ${className}`}
      aria-label="Account explainability"
    >
      <h3 className="text-sm font-semibold text-indigo-900 mb-4">Explainability</h3>

      <div className="space-y-4">
        <section>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">
            Why this score?
          </p>
          <p className="text-sm text-gray-800 leading-relaxed">{whyThisScore(account)}</p>
          <p className="text-xs text-gray-500 mt-1">
            Intent score: <span className="font-semibold text-gray-700">{account.intentScore}/100</span>
          </p>
        </section>

        <section>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">
            Buyer stage
          </p>
          <p className="text-sm text-gray-800 leading-relaxed">{buyerStageLine(account)}</p>
        </section>

        {account.topics.length > 0 && (
          <section>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-2">
              Active topics
            </p>
            <ul className="flex flex-wrap gap-1.5">
              {account.topics.map((topic) => (
                <li
                  key={topic}
                  className="rounded-full bg-white border border-indigo-200 px-2.5 py-0.5 text-xs font-medium text-indigo-800"
                >
                  {topic}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </aside>
  );
}
