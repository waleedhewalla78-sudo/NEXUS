/**
 * Feature 006 Sprint 3 — Merge rules-based slots with optional LLM enrichment.
 */

import type { QualificationSlots } from '@/lib/ai-cmo/conversation/qualification';
import { qualificationSlotsSchema } from '@/lib/ai-cmo/conversation/qualification';

export function domainFromEmail(email: string | null | undefined): string | null {
  if (!email || !email.includes('@')) return null;
  const domain = email.split('@')[1]?.trim().toLowerCase();
  if (!domain || domain.includes('gmail.') || domain.includes('yahoo.') || domain.includes('hotmail.') || domain.includes('outlook.')) {
    return null;
  }
  return domain;
}

export function mergeSlots(
  rules: QualificationSlots,
  llmPartial: Partial<QualificationSlots> | null | undefined,
): QualificationSlots {
  if (!llmPartial) return rules;
  return {
    budget: rules.budget ?? llmPartial.budget ?? null,
    intent: rules.intent ?? llmPartial.intent ?? null,
    timeline: rules.timeline ?? llmPartial.timeline ?? null,
    productInterest: rules.productInterest ?? llmPartial.productInterest ?? null,
    location: rules.location ?? llmPartial.location ?? null,
    contactName: rules.contactName ?? llmPartial.contactName ?? null,
    contactEmail: rules.contactEmail ?? llmPartial.contactEmail ?? null,
    contactPhone: rules.contactPhone ?? llmPartial.contactPhone ?? null,
    company: rules.company ?? llmPartial.company ?? null,
  };
}

export function parseConciergeLlmJson(text: string): {
  slots?: Partial<QualificationSlots>;
  draftReply?: string;
} {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return {};
    const raw = JSON.parse(match[0]) as {
      slots?: Record<string, unknown>;
      draftReply?: string;
      draft_reply?: string;
    };
    const slotsParsed = raw.slots
      ? qualificationSlotsSchema.partial().safeParse(raw.slots)
      : null;
    return {
      slots: slotsParsed?.success ? slotsParsed.data : undefined,
      draftReply:
        typeof raw.draftReply === 'string'
          ? raw.draftReply
          : typeof raw.draft_reply === 'string'
            ? raw.draft_reply
            : undefined,
    };
  } catch {
    return {};
  }
}

export const CONCIERGE_SYSTEM = `You are Concierge — MENA lead qualifier for WhatsApp/Chatwoot.
Extract qualification slots and draft a short natural reply (Masri if locale starts with ar, else English).
Return JSON only:
{"slots":{"budget":string|null,"intent":string|null,"timeline":string|null,"productInterest":string|null,"location":string|null,"contactName":string|null,"contactEmail":string|null,"contactPhone":string|null,"company":string|null},"draftReply":"string"}
Do not invent contact details. No markdown.`;
