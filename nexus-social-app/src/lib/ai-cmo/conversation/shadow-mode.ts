/**
 * Feature 006 Sprint 1 — Workspace conversation mode (Shadow / AI-Active).
 */

import type { ConversationMode } from '@/lib/ai-cmo/conversation/qualification';
import { DEFAULT_CONVERSATION_MODE } from '@/lib/ai-cmo/conversation/qualification';

export type WorkspaceConversationSettings = {
  workspaceId: string;
  mode: ConversationMode;
  localeDefault: string;
  complianceProfile: string;
};

/** Resolve mode from settings row or env override; default Shadow (FR-086). */
export function resolveConversationMode(
  settings?: Partial<WorkspaceConversationSettings> | null,
): ConversationMode {
  const fromEnv = process.env.CONVERSATION_DEFAULT_MODE;
  if (fromEnv === 'shadow' || fromEnv === 'ai_active' || fromEnv === 'off') {
    if (!settings?.mode) return fromEnv;
  }
  return settings?.mode ?? DEFAULT_CONVERSATION_MODE;
}

export function isShadowMode(mode: ConversationMode): boolean {
  return mode === 'shadow';
}

export function isAiActiveMode(mode: ConversationMode): boolean {
  return mode === 'ai_active';
}

/** Humans must send when Shadow or Off — Concierge only drafts. */
export function shouldAutoSendReply(mode: ConversationMode): boolean {
  return mode === 'ai_active';
}
