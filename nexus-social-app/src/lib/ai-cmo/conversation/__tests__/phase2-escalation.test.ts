import { beforeEach, describe, expect, it, vi } from 'vitest';

const persistQual = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ ok: true, id: 'qual-p2' }),
);
const persistLead = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ ok: true, id: 'lead-p2' }),
);
const persistEsc = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ ok: true, id: 'esc-p2' }),
);
const escalateMock = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ ok: true, demoMode: true, assignmentId: 'demo-assign-1' }),
);
const deliverMock = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ ok: true, demoMode: true, channel: 'private_note' }),
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
    complete: vi.fn().mockRejectedValue(new Error('skip llm')),
  },
}));

import { decideEscalation } from '@/lib/ai-cmo/conversation/escalation';
import { processConversationInbound } from '@/lib/ai-cmo/conversation/process-inbound';
import { validateWrite, SorTableNames } from '@/lib/sync/reconciler';

describe('Feature 006 Phase 2 — escalation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    persistQual.mockResolvedValue({ ok: true, id: 'qual-p2' });
    persistLead.mockResolvedValue({ ok: true, id: 'lead-p2' });
    persistEsc.mockResolvedValue({ ok: true, id: 'esc-p2' });
    escalateMock.mockResolvedValue({ ok: true, demoMode: true, assignmentId: 'demo-assign-1' });
    deliverMock.mockResolvedValue({ ok: true, demoMode: true, channel: 'private_note' });
  });

  it('decideEscalation triggers on legal threat', () => {
    const d = decideEscalation({
      inboundText: 'I will call my lawyer and file a lawsuit',
      confidence: 0.9,
    });
    expect(d.shouldEscalate).toBe(true);
    expect(d.reason).toBe('legal_threat');
  });

  it('decideEscalation triggers on low confidence', () => {
    const d = decideEscalation({ inboundText: 'hi', confidence: 0.1 });
    expect(d.shouldEscalate).toBe(true);
    expect(d.reason).toBe('low_confidence');
  });

  it('processInbound escalates hostile message and skips auto-send', async () => {
    const result = await processConversationInbound({
      workspaceId: '11111111-1111-1111-1111-111111111111',
      conversationId: 'cw-esc',
      inboundText: 'This is a scam fraud you idiots',
    });

    expect(result.ok).toBe(true);
    expect(result.escalated).toBe(true);
    expect(result.autoSend).toBe(false);
    expect(persistEsc).toHaveBeenCalled();
    expect(escalateMock).toHaveBeenCalled();
    expect(deliverMock).not.toHaveBeenCalled();
    expect(persistQual.mock.calls[0][0].status).toBe('escalated');
  });

  it('validates conversation_escalations schema', () => {
    const v = validateWrite(SorTableNames.CONVERSATION_ESCALATIONS, {
      workspace_id: '11111111-1111-1111-1111-111111111111',
      qualification_id: '22222222-2222-2222-2222-222222222222',
      reason: 'low_confidence',
      sentiment: 'neutral',
      context_payload: { slots: {} },
      status: 'open',
    });
    expect(v.ok).toBe(true);
  });
});
