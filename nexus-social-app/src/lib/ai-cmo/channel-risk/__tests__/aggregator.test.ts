import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  channelRiskAdvisories,
  type ChannelRiskSummary,
} from '@/lib/ai-cmo/channel-risk/aggregator';
import {
  computeChannelScore,
  scoreToRiskTier,
  CHANNEL_RISK_RULESET,
} from '@/lib/ai-cmo/channel-risk/ruleset';

describe('channel-risk ruleset', () => {
  it('maps score to risk tier', () => {
    expect(scoreToRiskTier(10)).toBe('LOW');
    expect(scoreToRiskTier(30)).toBe('MEDIUM');
    expect(scoreToRiskTier(55)).toBe('HIGH');
    expect(scoreToRiskTier(80)).toBe('CRITICAL');
  });

  it('boosts score with historical rejections', () => {
    const linkedin = CHANNEL_RISK_RULESET.find((r) => r.channel === 'linkedin')!;
    const score = computeChannelScore({
      baseScore: linkedin.baseScore,
      violations: 2,
      criticalCount: 1,
      highCount: 1,
    });
    expect(score).toBeGreaterThan(linkedin.baseScore);
  });
});

describe('channelRiskAdvisories', () => {
  it('returns advisory strings for HIGH/CRITICAL platforms only', () => {
    const summary: ChannelRiskSummary = {
      workspaceId: 'ws-1',
      totalViolations: 1,
      generatedAt: new Date().toISOString(),
      channels: [
        {
          channel: 'x',
          displayName: 'X (Twitter)',
          score: 55,
          riskTier: 'HIGH',
          factors: [],
          violations: 1,
          criticalCount: 0,
          highCount: 1,
          lastUpdatedAt: new Date().toISOString(),
        },
        {
          channel: 'linkedin',
          displayName: 'LinkedIn',
          score: 10,
          riskTier: 'LOW',
          factors: [],
          violations: 0,
          criticalCount: 0,
          highCount: 0,
          lastUpdatedAt: new Date().toISOString(),
        },
      ],
    };

    const advisories = channelRiskAdvisories(summary, ['x', 'linkedin']);
    expect(advisories).toHaveLength(1);
    expect(advisories[0]).toContain('X (Twitter)');
  });
});

describe('aggregateChannelRisk', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('includes curated platform rows even with zero violations', async () => {
    vi.doMock('@/lib/ai-cmo/channel-risk/live-signals', () => ({
      fetchLiveSignalsByChannel: vi.fn().mockResolvedValue(new Map()),
    }));

    vi.doMock('@/lib/supabase/server', () => ({
      supabaseAdmin: {
        from: () => ({
          select: () => ({
            eq: () => ({
              in: async () => ({ data: [], error: null }),
            }),
          }),
        }),
      },
    }));

    const { aggregateChannelRisk } = await import('@/lib/ai-cmo/channel-risk/aggregator');
    const summary = await aggregateChannelRisk('ws-test');

    expect(summary.channels.length).toBeGreaterThanOrEqual(5);
    expect(summary.channels[0]).toMatchObject({
      score: expect.any(Number),
      riskTier: expect.any(String),
      factors: expect.any(Array),
      lastUpdatedAt: expect.any(String),
      liveSignals: { rejectionRate24h: 0, lastRejectionReason: null },
    });
    expect(summary.generatedAt).toBeTruthy();
  });

  it('sets liveSignals null when publish tables unavailable', async () => {
    vi.doMock('@/lib/ai-cmo/channel-risk/live-signals', () => ({
      fetchLiveSignalsByChannel: vi.fn().mockResolvedValue(null),
    }));

    vi.doMock('@/lib/supabase/server', () => ({
      supabaseAdmin: {
        from: () => ({
          select: () => ({
            eq: () => ({
              in: async () => ({ data: [], error: null }),
            }),
          }),
        }),
      },
    }));

    const { aggregateChannelRisk } = await import('@/lib/ai-cmo/channel-risk/aggregator');
    const summary = await aggregateChannelRisk('ws-test');
    expect(summary.channels[0]?.liveSignals).toBeNull();
  });
});
