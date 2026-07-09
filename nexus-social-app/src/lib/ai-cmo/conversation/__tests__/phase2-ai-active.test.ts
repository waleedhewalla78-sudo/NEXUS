import { beforeEach, describe, expect, it, vi } from 'vitest';

const persistQual = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ ok: true, id: 'qual-active' }),
);
const persistLead = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ ok: true, id: 'lead-active' }),
);
const persistEsc = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ ok: true, id: 'esc-active' }),
);
const escalateMock = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ ok: true, demoMode: true, assignmentId: 'a1' }),
);
const deliverMock = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ ok: true, demoMode: true, channel: 'public' }),
);

vi.mock('@/lib/ai-cmo/conversation/persist', () => ({
  persistConversationQualification: persistQual,
  persistQualifiedLead: persistLead,
  persistConversationEscalation: persistEsc,
}));

vi.mock('@/lib/chatwoot/escalation-adapter', () => ({
  escalateToHuman: escalateMock,
  deliverConciergeDraft: deliverMock,
  buildEscalationNote: vi.fn().mockReturnValue('note'),
}));

const modeRow = vi.hoisted(() => ({
  current: null as null | {
    mode: string;
    locale_default: string;
    compliance_profile: string;
  },
}));

vi.mock('@/lib/supabase/server', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: vi.fn().mockImplementation(async () => ({ data: modeRow.current })),
        }),
      }),
    }),
  },
}));

vi.mock('@/lib/ai-cmo/providers/provider-router', () => ({
  providerRouter: {
    complete: vi.fn().mockRejectedValue(new Error('skip llm')),
  },
}));

import { processConversationInbound } from '@/lib/ai-cmo/conversation/process-inbound';
import { shouldAutoSendReply } from '@/lib/ai-cmo/conversation/shadow-mode';

describe('Feature 006 Phase 2 — AI-Active', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    modeRow.current = null;
    persistQual.mockResolvedValue({ ok: true, id: 'qual-active' });
    persistLead.mockResolvedValue({ ok: true, id: 'lead-active' });
    deliverMock.mockResolvedValue({ ok: true, demoMode: true, channel: 'public' });
  });

  it('shouldAutoSendReply only for ai_active', () => {
    expect(shouldAutoSendReply('ai_active')).toBe(true);
    expect(shouldAutoSendReply('shadow')).toBe(false);
    expect(shouldAutoSendReply('off')).toBe(false);
  });

  it('shadow mode delivers private note and does not auto-send', async () => {
    modeRow.current = {
      mode: 'shadow',
      locale_default: 'ar-EG',
      compliance_profile: 'mena_conversational_v1',
    };
    deliverMock.mockResolvedValue({ ok: true, demoMode: true, channel: 'private_note' });

    const result = await processConversationInbound({
      workspaceId: '11111111-1111-1111-1111-111111111111',
      conversationId: 'cw-shadow',
      inboundText: 'I want to buy budget 80k email ops@corp.io next month',
    });

    expect(result.ok).toBe(true);
    expect(result.mode).toBe('shadow');
    expect(result.autoSend).toBe(false);
    expect(deliverMock).toHaveBeenCalledWith(
      expect.objectContaining({ autoSend: false }),
    );
  });

  it('ai_active mode auto-sends when not escalated', async () => {
    modeRow.current = {
      mode: 'ai_active',
      locale_default: 'en-US',
      compliance_profile: 'mena_conversational_v1',
    };
    deliverMock.mockResolvedValue({ ok: true, demoMode: true, channel: 'public' });

    const result = await processConversationInbound({
      workspaceId: '11111111-1111-1111-1111-111111111111',
      conversationId: 'cw-active',
      inboundText: 'I want to buy budget 80k email ops@corp.io next month',
    });

    expect(result.ok).toBe(true);
    expect(result.mode).toBe('ai_active');
    expect(result.escalated).toBe(false);
    expect(result.autoSend).toBe(true);
    expect(deliverMock).toHaveBeenCalledWith(
      expect.objectContaining({ autoSend: true }),
    );
    expect(escalateMock).not.toHaveBeenCalled();
  });
});
