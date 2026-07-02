import { describe, expect, it } from 'vitest';
import { deriveFunnelStage, buildAbmPromptBlock } from '@/lib/ai-cmo/abm/intent-context';
import { normalizeDomain, currentMonthUtc } from '@/lib/ai-cmo/abm/intent-ingest';

describe('ABM intent context', () => {
  it('derives BOFU for high intent scores', () => {
    expect(deriveFunnelStage(85)).toBe('BOFU');
    expect(deriveFunnelStage(70)).toBe('BOFU');
  });

  it('derives MOFU for medium intent scores', () => {
    expect(deriveFunnelStage(55)).toBe('MOFU');
    expect(deriveFunnelStage(40)).toBe('MOFU');
  });

  it('derives TOFU for low intent scores', () => {
    expect(deriveFunnelStage(20)).toBe('TOFU');
  });

  it('builds ABM prompt block with account lines', () => {
    const block = buildAbmPromptBlock(
      [
        {
          accountName: 'Vodafone Egypt',
          domain: 'vodafone.com.eg',
          topics: ['AI Automation', '5G'],
          intentScore: 85,
          buyerStage: 'decision',
        },
      ],
      'BOFU',
    );
    expect(block).toContain('vodafone.com.eg');
    expect(block).toContain('BOFU');
    expect(block).toContain('bottom-of-funnel');
  });

  it('normalizes domain from URL', () => {
    expect(normalizeDomain('https://Vodafone.com/eg')).toBe('vodafone.com');
  });

  it('returns current month in YYYY-MM format', () => {
    expect(currentMonthUtc()).toMatch(/^\d{4}-\d{2}$/);
  });
});
