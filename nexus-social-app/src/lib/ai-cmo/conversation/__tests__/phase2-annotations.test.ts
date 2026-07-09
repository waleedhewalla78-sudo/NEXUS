import { describe, expect, it, vi } from 'vitest';

const persistLearning = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ ok: true, id: 'learn-1' }),
);

vi.mock('@/lib/ai-cmo/conversation/persist', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/ai-cmo/conversation/persist')>();
  return {
    ...actual,
    persistConversationAnnotationLearning: persistLearning,
  };
});

vi.mock('@/lib/supabase/server', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'qual-ann',
                draft_reply: 'Hello draft',
                slots: { intent: 'purchase_interest' },
                inbound_text: 'hi',
                metadata: {},
              },
            }),
          }),
        }),
      }),
    }),
  },
}));

import { captureConversationAnnotation } from '@/lib/ai-cmo/conversation/annotations';
import { validateWrite, SorTableNames } from '@/lib/sync/reconciler';

describe('Feature 006 Phase 2 — annotations', () => {
  it('captures annotation into ai_cmo_learnings via tone + annotation_kind', async () => {
    const result = await captureConversationAnnotation({
      workspaceId: '11111111-1111-1111-1111-111111111111',
      conversationId: 'cw-1',
      finalMessageText: 'Edited human reply',
      humanEdited: true,
      similarityScore: 0.4,
    });

    expect(result.ok).toBe(true);
    expect(result.learningId).toBe('learn-1');
    expect(persistLearning).toHaveBeenCalledWith(
      expect.objectContaining({
        context: expect.objectContaining({
          qualification_id: 'qual-ann',
        }),
        action: expect.objectContaining({ human_edited: true }),
      }),
    );
  });

  it('validates learning write with tone type', () => {
    const v = validateWrite(SorTableNames.AI_CMO_LEARNINGS, {
      workspace_id: '11111111-1111-1111-1111-111111111111',
      learning_type: 'tone',
      context: { annotation_kind: 'conversation_annotation' },
      action: { human_edited: true },
      outcome: { final_message_text: 'x' },
    });
    expect(v.ok).toBe(true);
  });
});
