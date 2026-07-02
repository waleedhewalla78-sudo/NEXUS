'use client';

type IntentLevel = 'high' | 'warm' | 'nurture';

function levelFromScore(score: number): IntentLevel {
  if (score >= 70) return 'high';
  if (score >= 40) return 'warm';
  return 'nurture';
}

const STYLES: Record<IntentLevel, string> = {
  high: 'bg-rose-100 text-rose-800 border-rose-200',
  warm: 'bg-amber-100 text-amber-800 border-amber-200',
  nurture: 'bg-sky-100 text-sky-800 border-sky-200',
};

const LABELS: Record<IntentLevel, string> = {
  high: '🔥 High Intent',
  warm: '◆ Warm Intent',
  nurture: '○ Nurture',
};

type Props = {
  score: number;
  topic?: string;
  className?: string;
};

export function IntentScoreBadge({ score, topic, className = '' }: Props) {
  const level = levelFromScore(score);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STYLES[level]} ${className}`}
      title={topic ? `Topic: ${topic}` : undefined}
    >
      {LABELS[level]}
      <span className="opacity-80">{score}</span>
    </span>
  );
}

export function funnelStageBadge(stage: 'BOFU' | 'MOFU' | 'TOFU') {
  const colors = {
    BOFU: 'bg-violet-100 text-violet-800',
    MOFU: 'bg-indigo-100 text-indigo-800',
    TOFU: 'bg-gray-100 text-gray-700',
  };
  return colors[stage];
}
