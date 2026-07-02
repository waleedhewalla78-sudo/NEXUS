import { describe, expect, it } from 'vitest';
import { buildAbmPlaybookObjective } from '@/lib/ai-cmo/abm/activate-playbook';

describe('ABM playbook activation', () => {
  it('builds objective with account context', () => {
    const objective = buildAbmPlaybookObjective({
      accountName: 'Vodafone Egypt',
      domain: 'vodafone.com.eg',
      industry: 'Telecommunications',
      intentScore: 88,
      buyerStage: 'decision',
      topics: ['AI Automation', '5G'],
      funnelStage: 'BOFU',
    });
    expect(objective).toContain('Vodafone Egypt');
    expect(objective).toContain('AI Automation');
    expect(objective).toContain('decision');
    expect(objective).toContain('BOFU');
  });

  it('handles empty topics', () => {
    const objective = buildAbmPlaybookObjective({
      accountName: 'Test Co',
      domain: 'test.com',
      industry: 'General',
      intentScore: 50,
      buyerStage: 'consideration',
      topics: [],
      funnelStage: 'MOFU',
    });
    expect(objective).toContain('general');
  });
});
