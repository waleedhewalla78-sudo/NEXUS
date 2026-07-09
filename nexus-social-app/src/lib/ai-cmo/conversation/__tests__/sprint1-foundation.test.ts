import { describe, expect, it } from 'vitest';
import {
  draftMasriReply,
  extractQualificationSlots,
  scoreSlots,
} from '@/lib/ai-cmo/conversation/qualification';
import {
  isShadowMode,
  resolveConversationMode,
  shouldAutoSendReply,
} from '@/lib/ai-cmo/conversation/shadow-mode';
import { conciergeAgent } from '@/lib/ai-cmo/agents/concierge-agent';
import { getMeshAgent, listMeshAgents } from '@/lib/ai-cmo/agents/registry';
import { SorTableNames, validateWrite } from '@/lib/sync/reconciler';

describe('Feature 006 Sprint 1 — qualification slots', () => {
  it('extracts email, phone, budget, intent from mixed text', () => {
    const slots = extractQualificationSlots(
      'عايز أشتري، budget: 50k EGP، call me +20 100 123 4567 or sales@acme.com next month',
    );
    expect(slots.intent).toBe('purchase_interest');
    expect(slots.budget).toMatch(/50k/i);
    expect(slots.contactEmail).toBe('sales@acme.com');
    expect(slots.contactPhone).toBeTruthy();
    expect(slots.timeline).toBeTruthy();
  });

  it('scores qualified when intent+budget+contact present', () => {
    const { score, band, reasons } = scoreSlots({
      intent: 'purchase_interest',
      budget: '50k',
      timeline: 'next month',
      contactEmail: 'a@b.com',
      contactPhone: null,
      company: null,
      productInterest: null,
      location: null,
      contactName: null,
    });
    expect(score).toBeGreaterThanOrEqual(70);
    expect(band).toBe('qualified');
    expect(reasons).toContain('intent_detected');
  });

  it('drafts Arabic reply when locale is ar', () => {
    const reply = draftMasriReply({ intent: null, budget: null }, 'ar-EG');
    expect(reply).toContain('أهلاً');
  });
});

describe('Feature 006 Sprint 1 — shadow mode', () => {
  it('defaults to shadow and does not auto-send', () => {
    const mode = resolveConversationMode(null);
    expect(mode).toBe('shadow');
    expect(isShadowMode(mode)).toBe(true);
    expect(shouldAutoSendReply(mode)).toBe(false);
  });
});

describe('Feature 006 Sprint 1 — concierge agent', () => {
  it('is registered in the mesh', () => {
    expect(listMeshAgents()).toContain('concierge');
    expect(getMeshAgent('concierge')?.agentName).toBe('concierge');
  });

  it('returns draft proposal without writing SoR', async () => {
    const out = await conciergeAgent.run({
      workspaceId: '11111111-1111-1111-1111-111111111111',
      userId: 'user-1',
      inboundText: 'I want to buy, budget 20k, email me at lead@corp.com',
      locale: 'en-US',
    });
    expect(out.agentName).toBe('concierge');
    expect(out.llmStubbed).toBe(true);
    expect(out.proposal.slots.contactEmail).toBe('lead@corp.com');
    expect(out.proposal.draftReply.length).toBeGreaterThan(0);
    expect(out.proposal.autoSend).toBe(false);
  });
});

describe('Feature 006 Sprint 1 — reconciler schemas', () => {
  it('validates qualified_leads write shape', () => {
    const result = validateWrite(SorTableNames.QUALIFIED_LEADS, {
      workspace_id: '11111111-1111-1111-1111-111111111111',
      contact_email: 'lead@corp.com',
      slots: { intent: 'purchase_interest' },
      status: 'new',
    });
    expect(result.ok).toBe(true);
  });

  it('validates conversation_qualifications write shape', () => {
    const result = validateWrite(SorTableNames.CONVERSATION_QUALIFICATIONS, {
      workspace_id: '11111111-1111-1111-1111-111111111111',
      conversation_id: 'cw-thread-1',
      channel: 'whatsapp',
      mode: 'shadow',
      inbound_text: 'hello',
      slots: {},
    });
    expect(result.ok).toBe(true);
  });
});
