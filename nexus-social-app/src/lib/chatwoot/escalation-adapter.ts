/**
 * Feature 006 Phase 2 — Chatwoot escalation adapter (FR-087 / CL-049).
 * Shared by Concierge path; extracted from legacy ai-orchestration assignToHuman.
 */

import { getConfig, getHeaders, sendMessage } from '@/lib/chatwoot/client';

export type EscalateToHumanInput = {
  conversationId: string | number;
  noteContent: string;
  /** Chatwoot assignee; 0 = unassigned / team queue (legacy default). */
  assigneeId?: number;
};

export type EscalateToHumanResult = {
  ok: boolean;
  demoMode?: boolean;
  assignmentId?: string | null;
  error?: string;
};

/** Post a private note and assign conversation to human queue. */
export async function escalateToHuman(
  input: EscalateToHumanInput,
): Promise<EscalateToHumanResult> {
  const { BASE_URL, API_TOKEN, ACCOUNT_ID, isConfigured } = getConfig();
  const conversationId = input.conversationId;

  if (!isConfigured || String(conversationId).startsWith('demo-')) {
    return { ok: true, demoMode: true, assignmentId: `demo-assign-${conversationId}` };
  }

  try {
    const noteUrl = `${BASE_URL}/api/v1/accounts/${ACCOUNT_ID}/conversations/${conversationId}/messages`;
    const noteRes = await fetch(noteUrl, {
      method: 'POST',
      headers: getHeaders(API_TOKEN),
      body: JSON.stringify({ content: input.noteContent, private: true }),
    });
    if (!noteRes.ok) {
      const txt = await noteRes.text();
      return { ok: false, error: `Chatwoot private note failed: ${noteRes.status} ${txt}` };
    }

    const assignUrl = `${BASE_URL}/api/v1/accounts/${ACCOUNT_ID}/conversations/${conversationId}/assignments`;
    const assignRes = await fetch(assignUrl, {
      method: 'POST',
      headers: getHeaders(API_TOKEN),
      body: JSON.stringify({ assignee_id: input.assigneeId ?? 0 }),
    });
    if (!assignRes.ok) {
      const txt = await assignRes.text();
      return { ok: false, error: `Chatwoot assign failed: ${assignRes.status} ${txt}` };
    }

    let assignmentId: string | null = null;
    try {
      const body = (await assignRes.json()) as { id?: string | number; payload?: { id?: string | number } };
      const raw = body.id ?? body.payload?.id;
      assignmentId = raw != null ? String(raw) : null;
    } catch {
      assignmentId = null;
    }

    return { ok: true, assignmentId };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Public reply (AI-Active) or private draft note (Shadow) — no assign on Shadow. */
export async function deliverConciergeDraft(input: {
  conversationId: string | number;
  draftReply: string;
  autoSend: boolean;
}): Promise<{ ok: boolean; demoMode?: boolean; channel: 'public' | 'private_note'; error?: string }> {
  if (!input.draftReply?.trim()) {
    return { ok: true, channel: input.autoSend ? 'public' : 'private_note' };
  }

  if (input.autoSend) {
    try {
      const res = await sendMessage(input.conversationId, input.draftReply);
      return {
        ok: true,
        demoMode: Boolean((res as { demoMode?: boolean }).demoMode),
        channel: 'public',
      };
    } catch (err) {
      return {
        ok: false,
        channel: 'public',
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  try {
    const note = `📝 **Concierge Shadow Draft** (human send required)\n\n${input.draftReply}`;
    const res = await sendMessage(input.conversationId, note, { private: true });
    return {
      ok: true,
      demoMode: Boolean((res as { demoMode?: boolean }).demoMode),
      channel: 'private_note',
    };
  } catch (err) {
    return {
      ok: false,
      channel: 'private_note',
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export function buildEscalationNote(input: {
  reason: string;
  draftReply: string;
  slots: Record<string, unknown>;
  inboundText: string;
  confidence: number;
}): string {
  return [
    `⚠️ **Concierge Escalation:** ${input.reason}`,
    '',
    `**Confidence:** ${(input.confidence * 100).toFixed(0)}%`,
    `**Suggested Draft:**`,
    input.draftReply || '(none)',
    '',
    `**Slots:** \`${JSON.stringify(input.slots)}\``,
    '',
    `**Inbound:**`,
    input.inboundText.slice(0, 800),
  ].join('\n');
}
