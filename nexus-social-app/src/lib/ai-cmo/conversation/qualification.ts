/**
 * Feature 006 Sprint 1 — Conversation qualification domain types & slot extraction.
 */

import { z } from 'zod';
import { uuidLikeSchema } from '@/lib/validation/uuid-like';

export const conversationModeSchema = z.enum(['shadow', 'ai_active', 'off']);
export type ConversationMode = z.infer<typeof conversationModeSchema>;

export const conversationChannelSchema = z.enum(['whatsapp', 'chatwoot', 'web', 'other']);
export type ConversationChannel = z.infer<typeof conversationChannelSchema>;

export const qualificationSlotsSchema = z.object({
  budget: z.string().nullable().optional(),
  intent: z.string().nullable().optional(),
  timeline: z.string().nullable().optional(),
  productInterest: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  contactName: z.string().nullable().optional(),
  contactEmail: z.string().email().nullable().optional(),
  contactPhone: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
});

export type QualificationSlots = z.infer<typeof qualificationSlotsSchema>;

export const inboundConversationPayloadSchema = z.object({
  workspaceId: uuidLikeSchema,
  conversationId: z.string().min(1),
  channel: conversationChannelSchema.default('whatsapp'),
  locale: z.string().default('ar-EG'),
  inboundText: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type InboundConversationPayload = z.infer<typeof inboundConversationPayloadSchema>;

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_RE = /(?:\+?\d[\d\s()-]{7,}\d)/;
const BUDGET_RE = /(?:budget|ميزانية|سعر|price)\s*[:\-]?\s*([^\n,.]+)/i;
const TIMELINE_RE = /(?:timeline|موعد|when|خلال|this (?:week|month)|next (?:week|month)|قريب)\s*[:\-]?\s*([^\n,.]+)?/i;
const INTENT_BUY_RE = /(?:buy|purchase|interested|عايز|أريد|مهتم|احجز|book)/i;

/** Rules-based slot extraction (no LLM) — Sprint 1 scaffold. */
export function extractQualificationSlots(text: string): QualificationSlots {
  const email = text.match(EMAIL_RE)?.[0] ?? null;
  const phone = text.match(PHONE_RE)?.[0]?.replace(/\s+/g, ' ').trim() ?? null;
  const budget = text.match(BUDGET_RE)?.[1]?.trim() ?? null;
  const timelineMatch = text.match(TIMELINE_RE);
  const timeline = timelineMatch
    ? (timelineMatch[1]?.trim() || timelineMatch[0].trim())
    : null;
  const intent = INTENT_BUY_RE.test(text) ? 'purchase_interest' : null;

  return {
    budget,
    intent,
    timeline,
    productInterest: null,
    location: null,
    contactName: null,
    contactEmail: email,
    contactPhone: phone,
    company: null,
  };
}

export function scoreSlots(slots: QualificationSlots): {
  score: number;
  band: 'cold' | 'warm' | 'hot' | 'qualified';
  reasons: string[];
} {
  const reasons: string[] = [];
  let score = 0;

  if (slots.intent) {
    score += 30;
    reasons.push('intent_detected');
  }
  if (slots.budget) {
    score += 25;
    reasons.push('budget_present');
  }
  if (slots.timeline) {
    score += 20;
    reasons.push('timeline_present');
  }
  if (slots.contactEmail || slots.contactPhone) {
    score += 15;
    reasons.push('contact_present');
  }
  if (slots.company) {
    score += 10;
    reasons.push('company_present');
  }

  score = Math.min(100, score);
  const band =
    score >= 70 ? 'qualified' : score >= 50 ? 'hot' : score >= 25 ? 'warm' : 'cold';

  return { score, band, reasons };
}

export function draftMasriReply(slots: QualificationSlots, locale: string): string {
  const isAr = locale.toLowerCase().startsWith('ar');
  if (isAr) {
    const bits: string[] = ['أهلاً! أنا هنا أساعدك.'];
    if (!slots.budget) bits.push('ممكن تقولّي الميزانية التقريبية؟');
    if (!slots.timeline) bits.push('وإمتى حابب تبدأ؟');
    if (!slots.intent) bits.push('بتدور على إيه بالظبط؟');
    if (slots.intent && slots.budget) bits.push('تمام، هجهّزلك التفاصيل وأحوّلك لفريق المبيعات.');
    return bits.join(' ');
  }

  const bits: string[] = ['Hi! Happy to help.'];
  if (!slots.budget) bits.push('What budget range are you working with?');
  if (!slots.timeline) bits.push('When are you looking to start?');
  if (!slots.intent) bits.push('What are you looking for?');
  if (slots.intent && slots.budget) bits.push('Great — I will prepare details and connect you with sales.');
  return bits.join(' ');
}

export const DEFAULT_CONVERSATION_MODE: ConversationMode = 'shadow';
