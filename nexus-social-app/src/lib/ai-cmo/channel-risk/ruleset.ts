/**
 * Feature 004 Sprint 15 — Curated platform TOS / rate-limit risk rules (V1.5).
 * CLOSED: S15-004-002 — no live TOS scraping; static rules JSON in repo.
 */

export type ChannelRiskFactor = {
  id: string;
  label: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
};

export type ChannelRiskRule = {
  channel: string;
  displayName: string;
  baseScore: number;
  factors: ChannelRiskFactor[];
};

export const CHANNEL_RISK_RULESET: ChannelRiskRule[] = [
  {
    channel: 'linkedin',
    displayName: 'LinkedIn',
    baseScore: 20,
    factors: [
      { id: 'rate_limit', label: 'Professional network posting rate limits', severity: 'MEDIUM' },
      { id: 'b2b_claims', label: 'B2B performance claims restricted', severity: 'HIGH' },
    ],
  },
  {
    channel: 'x',
    displayName: 'X (Twitter)',
    baseScore: 30,
    factors: [
      { id: 'automation', label: 'Automation and duplicate content policies', severity: 'HIGH' },
      { id: 'rate_limit', label: 'Tweet frequency caps', severity: 'MEDIUM' },
    ],
  },
  {
    channel: 'instagram',
    displayName: 'Instagram',
    baseScore: 25,
    factors: [
      { id: 'branded_content', label: 'Branded content disclosure rules', severity: 'HIGH' },
      { id: 'media_rights', label: 'Music and media licensing', severity: 'MEDIUM' },
    ],
  },
  {
    channel: 'facebook',
    displayName: 'Facebook',
    baseScore: 22,
    factors: [
      { id: 'ad_policies', label: 'Special ad category restrictions', severity: 'HIGH' },
      { id: 'community', label: 'Community standards on sensitive topics', severity: 'MEDIUM' },
    ],
  },
  {
    channel: 'tiktok',
    displayName: 'TikTok',
    baseScore: 35,
    factors: [
      { id: 'commercial', label: 'Commercial content disclosure', severity: 'HIGH' },
      { id: 'youth', label: 'Youth safety and restricted categories', severity: 'HIGH' },
    ],
  },
];

export function normalizeChannelKey(channel: string): string {
  return channel.trim().toLowerCase().replace(/\s+/g, '_').replace(/[()]/g, '');
}

export function findChannelRule(channel: string): ChannelRiskRule | undefined {
  const key = normalizeChannelKey(channel);
  return CHANNEL_RISK_RULESET.find(
    (r) => r.channel === key || normalizeChannelKey(r.displayName) === key,
  );
}

export function scoreToRiskTier(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  if (score >= 75) return 'CRITICAL';
  if (score >= 50) return 'HIGH';
  if (score >= 25) return 'MEDIUM';
  return 'LOW';
}

export function computeChannelScore(input: {
  baseScore: number;
  violations: number;
  criticalCount: number;
  highCount: number;
}): number {
  const raw =
    input.baseScore + input.violations * 8 + input.criticalCount * 12 + input.highCount * 5;
  return Math.min(100, Math.max(0, raw));
}
