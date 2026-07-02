import { describe, expect, it } from 'vitest';
import { buildTargetAccountPromptBlock, intentLevelLabel } from '@/lib/ai-cmo/abm/target-account-prompt';
import type { TargetAccount } from '@/types/abm';

const vodafone: TargetAccount = {
  id: 'mock-vodafone',
  name: 'Vodafone Egypt',
  domain: 'vodafone.com.eg',
  intentScore: 88,
  buyerStage: 'decision',
  topics: ['AI Automation', '5G'],
  industry: 'Telecommunications',
};

describe('target account prompt', () => {
  it('injects BOFU directive for decision stage', () => {
    const block = buildTargetAccountPromptBlock(vodafone);
    expect(block).toContain('Vodafone Egypt');
    expect(block).toContain('Bottom-of-Funnel (BOFU)');
    expect(block).toContain('hard ROI pitches');
  });

  it('injects MOFU directive for consideration stage', () => {
    const block = buildTargetAccountPromptBlock({
      ...vodafone,
      buyerStage: 'consideration',
      intentScore: 58,
    });
    expect(block).toContain('Mid-Funnel (MOFU)');
    expect(block).toContain('comparison guides');
  });

  it('injects TOFU directive for awareness stage', () => {
    const block = buildTargetAccountPromptBlock({
      ...vodafone,
      name: 'Etisalat Egypt',
      buyerStage: 'awareness',
      intentScore: 28,
    });
    expect(block).toContain('Top-of-Funnel (TOFU)');
    expect(block).toContain('thought leadership');
  });

  it('labels intent bands', () => {
    expect(intentLevelLabel(88)).toBe('High Intent');
    expect(intentLevelLabel(55)).toBe('Medium Intent');
    expect(intentLevelLabel(20)).toBe('Low Intent');
  });
});
