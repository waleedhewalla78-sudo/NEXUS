import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  buildIngestedOutcome,
  calculateRoiRatio,
} from '@/jobs/ai-cmo/outcome-ingestion';

vi.mock('@/lib/supabase/server', () => ({
  supabaseAdmin: { from: vi.fn() },
}));

vi.mock('@/lib/ai-cmo/utils/secure-reconciler-writer', () => ({
  secureSyncToSoR: vi.fn().mockResolvedValue({ ok: true, id: 'out-1' }),
  securePatchSoR: vi.fn().mockResolvedValue({ ok: true, id: 'out-1' }),
}));

describe('outcome-ingestion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calculates ROI ratio from revenue and cost', () => {
    expect(calculateRoiRatio(150, 100)).toBe(0.5);
    expect(calculateRoiRatio(0, 0)).toBeNull();
  });

  it('builds ingested outcome from 003 analytics aggregate', () => {
    const outcome = buildIngestedOutcome({
      workspaceId: '550e8400-e29b-41d4-a716-446655440000',
      campaignId: '660e8400-e29b-41d4-a716-446655440001',
      postId: '770e8400-e29b-41d4-a716-446655440002',
      contentPieceId: '880e8400-e29b-41d4-a716-446655440003',
      analytics: { impressions: 1000, clicks: 50, conversions: 5, engagement_rate: 0.05 },
      costUsd: 20,
    });

    expect(outcome.impressions).toBe(1000);
    expect(outcome.conversions).toBe(5);
    expect(outcome.roiRatio).toBeGreaterThan(0);
    expect(outcome.postId).toBe('770e8400-e29b-41d4-a716-446655440002');
  });
});
