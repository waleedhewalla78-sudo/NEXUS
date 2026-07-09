import { beforeEach, describe, expect, it, vi } from 'vitest';

const persistQual = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ ok: true, id: 'qual-s4' }),
);
const persistLead = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ ok: true, id: 'lead-s4' }),
);

vi.mock('@/lib/ai-cmo/conversation/persist', () => ({
  persistConversationQualification: persistQual,
  persistQualifiedLead: persistLead,
}));

vi.mock('@/lib/supabase/server', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        }),
      }),
    }),
  },
}));

vi.mock('@/lib/ai-cmo/providers/provider-router', () => ({
  providerRouter: {
    complete: vi.fn().mockRejectedValue(new Error('provider down')),
    generate: vi.fn().mockRejectedValue(new Error('provider down')),
  },
}));

import { processConversationInbound } from '@/lib/ai-cmo/conversation/process-inbound';
import { getAllAiCmoInngestFunctions } from '@/lib/orchestration/inngest-functions';
import { validateWrite, SorTableNames } from '@/lib/sync/reconciler';
import { getMeshAgent } from '@/lib/ai-cmo/agents/registry';

describe('Feature 006 Sprint 4 — Phase 1 harden', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    persistQual.mockResolvedValue({ ok: true, id: 'qual-s4' });
    persistLead.mockResolvedValue({ ok: true, id: 'lead-s4' });
  });

  it('survives LLM failure and still persists Shadow draft', async () => {
    const result = await processConversationInbound({
      workspaceId: '11111111-1111-1111-1111-111111111111',
      conversationId: 'cw-s4',
      inboundText: 'I want to buy budget 80k email ops@corp.io next month',
      channel: 'chatwoot',
      locale: 'en-US',
    });
    expect(result.ok).toBe(true);
    expect(result.mode).toBe('shadow');
    expect(result.autoSend).toBe(false);
    expect(result.draftReply).toBeTruthy();
    expect(result.qualificationId).toBe('qual-s4');
    expect(result.leadId).toBe('lead-s4');
    expect(result.accountDomain).toBe('corp.io');
    expect(persistLead).toHaveBeenCalledWith(
      expect.objectContaining({
        accountDomain: 'corp.io',
      }),
    );
  });

  it('keeps concierge registered and inbound function present', () => {
    expect(getMeshAgent('concierge')?.agentName).toBe('concierge');
    expect(getAllAiCmoInngestFunctions().length).toBeGreaterThanOrEqual(10);
  });

  it('validates all Sprint 1 SoR table write shapes', () => {
    const ws = '11111111-1111-1111-1111-111111111111';
    expect(
      validateWrite(SorTableNames.LEAD_SCORES, {
        workspace_id: ws,
        score: 80,
        band: 'qualified',
      }).ok,
    ).toBe(true);
    expect(
      validateWrite(SorTableNames.CONVERSATION_ESCALATIONS, {
        workspace_id: ws,
        qualification_id: ws,
        reason: 'hostile',
        status: 'open',
      }).ok,
    ).toBe(true);
    expect(
      validateWrite(SorTableNames.WORKSPACE_CONVERSATION_SETTINGS, {
        workspace_id: ws,
        mode: 'shadow',
      }).ok,
    ).toBe(true);
  });
});
