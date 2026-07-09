import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  domainFromEmail,
  mergeSlots,
  parseConciergeLlmJson,
} from '@/lib/ai-cmo/conversation/llm-enrichment';

const mockComplete = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    text: JSON.stringify({
      slots: { company: 'Acme Corp', intent: 'purchase_interest' },
      draftReply: 'Thanks — I will connect you with sales.',
    }),
    provider: 'openrouter',
    modelUsed: 'openai/gpt-4o-mini',
    stubbed: false,
  }),
);

vi.mock('@/lib/ai-cmo/providers/provider-router', () => ({
  providerRouter: { complete: mockComplete, generate: mockComplete },
}));

import { conciergeAgent } from '@/lib/ai-cmo/agents/concierge-agent';

describe('Feature 006 Sprint 3 — LLM enrichment helpers', () => {
  it('extracts corporate domain and ignores gmail', () => {
    expect(domainFromEmail('a@acme.com')).toBe('acme.com');
    expect(domainFromEmail('a@gmail.com')).toBeNull();
  });

  it('merges LLM slots without overwriting rules', () => {
    const merged = mergeSlots(
      { budget: '10k', intent: null, contactEmail: 'a@acme.com' },
      { intent: 'purchase_interest', budget: 'should-not-win', company: 'Acme' },
    );
    expect(merged.budget).toBe('10k');
    expect(merged.intent).toBe('purchase_interest');
    expect(merged.company).toBe('Acme');
  });

  it('parses concierge LLM JSON', () => {
    const parsed = parseConciergeLlmJson(
      'Here:\n{"slots":{"timeline":"next week"},"draftReply":"أهلاً"}',
    );
    expect(parsed.slots?.timeline).toBe('next week');
    expect(parsed.draftReply).toBe('أهلاً');
  });
});

describe('Feature 006 Sprint 3 — Concierge LLM path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('enriches via ProviderRouter when not rulesOnly', async () => {
    const out = await conciergeAgent.run({
      workspaceId: '11111111-1111-1111-1111-111111111111',
      userId: 'u1',
      inboundText: 'I want to buy, email sales@acme.com budget 20k',
      locale: 'en-US',
    });
    expect(mockComplete).toHaveBeenCalled();
    expect(out.llmStubbed).toBe(false);
    expect(out.proposal.slots.company).toBe('Acme Corp');
    expect(out.proposal.draftReply).toContain('sales');
    expect(out.proposal.accountDomain).toBe('acme.com');
  });

  it('skips LLM when rulesOnly', async () => {
    const out = await conciergeAgent.run({
      workspaceId: '11111111-1111-1111-1111-111111111111',
      userId: 'u1',
      inboundText: 'buy now sales@acme.com',
      rulesOnly: true,
    });
    expect(mockComplete).not.toHaveBeenCalled();
    expect(out.llmStubbed).toBe(true);
    expect(out.proposal.accountDomain).toBe('acme.com');
  });
});
