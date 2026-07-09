# Feature 006 — User Stories

**Feature:** Conversational Revenue Loop  
**Created:** 2026-07-09

---

## US-080 — Conversational compliance profile

**As a** compliance officer  
**I want** a `mena_conversational_v1` profile for dialect replies  
**So that** published MSA rules and conversational dialect rules stay distinct under one Policy Engine  

**Acceptance:** Profile loads via catalog; CRITICAL PDPL/regulated-claim rules still block; dialect slang is allowed in conversational context (not auto-blocked as in `mena_v1` MSA rule).

**Status:** Phase 0

---

## US-081 — Cost-to-serve visibility

**As a** founder / finance owner  
**I want** per-client cost-to-serve (LLM + WhatsApp + labor + infra) and gross margin %  
**So that** we can enforce the ≥55% margin gate before scaling  

**Acceptance:** Model computes margin from inputs; FAIL when margin < 55%; unit tests cover formula.

**Status:** Phase 0

---

## US-082 — Verify inbound prerequisites

**As an** operator  
**I want** documented answers for Chatwoot dialect baseline, WhatsApp BSP, Meta-gate independence, and wedge account  
**So that** Phase 1 does not start on unverified assumptions  

**Acceptance:** Checklist in clarifications / ops runbook completed before FR-083 coding.

**Status:** Phase 0 (human)

---

## US-083 — Concierge qualifies inbound lead

**As a** sales lead  
**I want** inbound WhatsApp/Chatwoot messages qualified in Masri with budget/intent/timeline slots  
**So that** my team receives scored leads, not raw chats  

**Acceptance:** Concierge returns slots + score; draft reply in dialect; no fine-tuning required.

**Status:** Phase 1

---

## US-084 — Shadow Mode draft-only

**As a** client sales lead  
**I want** AI drafts logged while humans send  
**So that** we validate quality without risking brand embarrassment  

**Acceptance:** Drafts visible in Chatwoot/ops view; human send path unchanged; quality annotations captured.

**Status:** Phase 1

---

## US-085 — Qualified lead to CRM mirror

**As a** RevOps user  
**I want** qualified leads written via reconciler into `qualified_leads` linked to `crm_activity_mirror`  
**So that** attribution closes the loop  

**Acceptance:** Reconciler-only write; RLS enforced; linkable to account domain.

**Status:** Phase 1

---

## US-086 — Escalation with full context

**As a** Pit Crew operator  
**I want** low-confidence / negative-sentiment conversations routed to me in Chatwoot with slots + transcript  
**So that** I never re-ask the lead  

**Acceptance:** Escalation creates/assigns Chatwoot conversation with context payload.

**Status:** Phase 2

---

## US-087 — AI-Active with oversight

**As an** ops lead  
**I want** to flip Shadow → AI-Active after client sign-off  
**So that** AI responds live with human takeover available  

**Acceptance:** Mode flag per workspace; takeover works; incident drill documented.

**Status:** Phase 2

---

## US-088 — End-to-end ABM → conversation → closed-won

**As a** CMO  
**I want** one audited thread from ABM activation through conversation to attributed closed-won  
**So that** board narrative is credible  

**Acceptance:** Demo account shows full chain in attribution/export.

**Status:** Phase 3

---

## US-089 — Margin gate decision

**As a** founder  
**I want** a hard go/no-go when gross margin < 55%  
**So that** we never scale an unprofitable delivery model  

**Acceptance:** Gate report produced; FAIL blocks Phase 4 scale tasks.

**Status:** Phase 3
