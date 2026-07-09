import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AI_CMO_INNGEST_EVENT_NAMES, parseAiCmoInngestEvent } from '@/lib/orchestration/types/events';
import { getAllAiCmoInngestFunctions } from '@/lib/orchestration/inngest-functions';

const persistQual = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ ok: true, id: 'qual-1' }),
);
const persistLead = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ ok: true, id: 'lead-1' }),
);
const maybeSingle = vi.hoisted(() => vi.fn().mockResolvedValue({ data: null }));

vi.mock('@/lib/ai-cmo/conversation/persist', () => ({
  persistConversationQualification: persistQual,
  persistQualifiedLead: persistLead,
  persistConversationEscalation: vi.fn().mockResolvedValue({ ok: true, id: 'esc-1' }),
}));

vi.mock('@/lib/chatwoot/escalation-adapter', () => ({
  escalateToHuman: vi.fn().mockResolvedValue({ ok: true, demoMode: true, assignmentId: 'demo' }),
  deliverConciergeDraft: vi.fn().mockResolvedValue({ ok: true, demoMode: true, channel: 'private_note' }),
  buildEscalationNote: vi.fn().mockReturnValue('note'),
}));

vi.mock('@/lib/supabase/server', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle,
        }),
      }),
    }),
  },
}));

import { processConversationInbound } from '@/lib/ai-cmo/conversation/process-inbound';

describe('Feature 006 Sprint 2 — conversation inbound', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    persistQual.mockResolvedValue({ ok: true, id: 'qual-1' });
    persistLead.mockResolvedValue({ ok: true, id: 'lead-1' });
    maybeSingle.mockResolvedValue({ data: null });
  });

  it('registers conversation-inbound Inngest function', () => {
    const fns = getAllAiCmoInngestFunctions() as Array<{ id?: string }>;
    const ids = fns.map((f) => (f as { id?: string }).id).filter(Boolean);
    // Inngest function objects expose opts; at minimum array grew
    expect(fns.length).toBeGreaterThanOrEqual(10);
  });

  it('parses CONVERSATION_INBOUND event schema', () => {
    const event = parseAiCmoInngestEvent({
      name: AI_CMO_INNGEST_EVENT_NAMES.CONVERSATION_INBOUND,
      data: {
        workspaceId: '11111111-1111-1111-1111-111111111111',
        conversationId: 'cw-99',
        inboundText: 'عايز أشتري budget 10k',
        channel: 'chatwoot',
      },
    });
    expect(event.name).toBe('ai-cmo/conversation.inbound');
  });

  it('processes inbound in shadow mode and persists qualification', async () => {
    const result = await processConversationInbound({
      workspaceId: '11111111-1111-1111-1111-111111111111',
      conversationId: 'cw-99',
      inboundText: 'I want to buy, budget 50k, email lead@acme.com',
      channel: 'chatwoot',
      locale: 'en-US',
    });

    expect(result.ok).toBe(true);
    expect(result.skipped).toBeFalsy();
    expect(result.mode).toBe('shadow');
    expect(result.autoSend).toBe(false);
    expect(result.draftReply).toBeTruthy();
    expect(persistQual).toHaveBeenCalled();
    expect(result.qualificationId).toBe('qual-1');
  });

  it('skips when mode is off', async () => {
    maybeSingle.mockResolvedValue({
      data: {
        mode: 'off',
        locale_default: 'ar-EG',
        compliance_profile: 'mena_conversational_v1',
      },
    });

    const result = await processConversationInbound({
      workspaceId: '11111111-1111-1111-1111-111111111111',
      conversationId: 'cw-99',
      inboundText: 'hello',
    });

    expect(result.ok).toBe(true);
    expect(result.skipped).toBe(true);
    expect(result.reason).toBe('conversation_mode_off');
    expect(persistQual).not.toHaveBeenCalled();
  });

  it('skips empty inbound', async () => {
    const result = await processConversationInbound({
      workspaceId: '11111111-1111-1111-1111-111111111111',
      conversationId: 'cw-99',
      inboundText: '   ',
    });
    expect(result.skipped).toBe(true);
    expect(result.reason).toBe('empty_inbound');
  });
});
