import { describe, expect, it } from 'vitest';
import {
  PII_REDACTED,
  scrubPii,
  scrubPiiForTableWrite,
  containsUnscrubbedPii,
} from '@/lib/governance/pii-scrubber';
import { SorTableNames } from '@/lib/sync/reconciler';

describe('pii-scrubber', () => {
  it('redacts emails in nested JSON arrays', () => {
    const input = {
      drafts: [
        { caption: 'Reach us at sales@acme.com for a demo' },
        { notes: ['Call +971 50 123 4567', 'Email support@client.io'] },
      ],
    };

    const result = scrubPii(input) as typeof input;
    expect(JSON.stringify(result)).not.toContain('sales@acme.com');
    expect(JSON.stringify(result)).not.toContain('support@client.io');
    expect(JSON.stringify(result)).toContain(PII_REDACTED);
  });

  it('does not falsely scrub brand@voice or @mentions', () => {
    const input = {
      tone: 'brand@voice',
      caption: 'Follow @nexus on LinkedIn for tips',
    };

    const result = scrubPii(input) as typeof input;
    expect(result.tone).toBe('brand@voice');
    expect(result.caption).toBe('Follow @nexus on LinkedIn for tips');
  });

  it('preserves ignoreKeys like brand_name', () => {
    const input = {
      brand_name: 'Acme Corp — contact ceo@acme.com',
      caption: 'Email ceo@acme.com today',
    };

    const result = scrubPii(input) as typeof input;
    expect(result.brand_name).toContain('ceo@acme.com');
    expect(result.caption).toContain(PII_REDACTED);
    expect(result.caption).not.toContain('ceo@acme.com');
  });

  it('redacts credit card patterns', () => {
    const input = 'Payment failed for card 4111 1111 1111 1111';
    const result = scrubPii(input) as string;
    expect(result).not.toContain('4111');
    expect(result).toContain(PII_REDACTED);
  });

  it('scrubs ai_cmo_learnings.context before SoR write', () => {
    const data = scrubPiiForTableWrite(SorTableNames.AI_CMO_LEARNINGS, {
      workspace_id: '550e8400-e29b-41d4-a716-446655440000',
      learning_type: 'channel',
      context: { note: 'User john.doe@example.com churned' },
      action: { email: 'ops@agency.com' },
      outcome: { ok: true },
      confidence: 0.8,
    });

    expect(JSON.stringify(data.context)).not.toContain('john.doe@example.com');
    expect(JSON.stringify(data.action)).not.toContain('ops@agency.com');
    expect(data.confidence).toBe(0.8);
  });

  it('scrubs ai_cmo_agent_decisions.input_summary', () => {
    const data = scrubPiiForTableWrite(SorTableNames.AI_CMO_AGENT_DECISIONS, {
      workspace_id: '550e8400-e29b-41d4-a716-446655440000',
      agent_name: 'creator',
      input_hash: 'abc123',
      input_summary: { prompt: 'Draft for client@corp.com' },
      output: { caption: 'Call +1-555-010-9999' },
    });

    expect(JSON.stringify(data.input_summary)).not.toContain('client@corp.com');
    expect(JSON.stringify(data.output)).not.toContain('555-010-9999');
  });

  it('does not scrub unrelated tables', () => {
    const data = scrubPiiForTableWrite(SorTableNames.AI_CMO_CAMPAIGNS, {
      workspace_id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Campaign for user@test.com',
    });

    expect(data.name).toBe('Campaign for user@test.com');
  });

  it('detects unscrubbed PII in text', () => {
    expect(containsUnscrubbedPii('hello@test.com')).toBe(true);
    expect(containsUnscrubbedPii('brand@voice')).toBe(false);
  });
});
