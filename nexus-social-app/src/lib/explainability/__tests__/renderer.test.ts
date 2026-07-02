import { describe, expect, it } from 'vitest';
import { renderExplainability } from '@/lib/explainability/renderer';

describe('explainability renderer', () => {
  const baseInput = {
    decision: 'Publish campaign draft',
    confidence: 0.82,
    confidenceBand: 'medium' as const,
    rationaleBullets: ['Audience match', 'Quality gate passed'],
    recommendedAction: 'Schedule publish',
  };

  it('renders executive persona with limited bullets', () => {
    const output = renderExplainability({ ...baseInput, persona: 'executive' });
    expect(output.persona).toBe('executive');
    expect(output.showTechnicalDetail).toBe(false);
    expect(output.bullets.length).toBeLessThanOrEqual(3);
    expect(output.headline).toBe('Publish campaign draft');
  });

  it('renders operator persona with technical detail', () => {
    const output = renderExplainability({
      ...baseInput,
      persona: 'operator',
      policySummary: 'Approved',
      qualitySummary: 'Score 85%',
    });
    expect(output.showTechnicalDetail).toBe(true);
    expect(output.body).toContain('Moderate confidence');
  });

  it('renders compliance persona with policy focus', () => {
    const output = renderExplainability({
      ...baseInput,
      persona: 'compliance',
      policySummary: 'Requires legal review',
      riskFlags: ['pricing claim'],
    });
    expect(output.headline).toContain('Compliance review');
    expect(output.bullets).toContain('pricing claim');
  });
});
