# Feature Specification: Conversational Revenue Loop (Feature 006)

**Feature Branch:** `006-conversational-revenue-loop`  
**Created:** 2026-07-09 (`/speckit.specify`)  
**Status:** Phase 0 — De-risk & foundation  
**Baseline:** [005 Enterprise Revenue Loop](../005-enterprise-revenue-loop/spec.md) · Integration Assessment 2026-07  
**User stories:** [user-stories.md](./user-stories.md) (US-080–US-089)

**Input:** Absorb the proposed dialect-native WhatsApp/inbound qualifier into the existing Nexus Social / Diligent AI platform — fill the mid-funnel hole between ABM demand gen and CRM closed-won attribution.

---

## 1. Product Vision (What We Want to Build)

Close the revenue loop:

> **ABM intent → governed campaign → Masri/Khaleeji conversation → human-supervised qualification → booked meeting → CRM closed-won → attributed, audited revenue** — under one Policy Engine and one FinOps ledger, with proven per-client margin.

### Problem

The platform can **generate** demand (003/004/005) and **attribute** revenue, but has nothing purpose-built that converts an engaged prospect into a **scored, booked, CRM-written lead in Arabic dialect**. Point WhatsApp bots lack governance/attribution; social suites lack conversational qualification.

### Personas (006)

| Persona | Need |
|---------|------|
| **Enterprise CMO / RevOps** | One auditable thread from campaign → conversation → closed-won |
| **Sales lead (client)** | Qualified pipeline, not chat logs; Shadow Mode trust |
| **Pit Crew / Ops** | Supervise via existing Chatwoot; annotate for learning |
| **Compliance (MENA)** | Dialect conversational register distinct from MSA publish pack |
| **Founder / Finance** | ≥55% gross margin per client before scale |

### Strategic principles

1. **Integration, not bolt-on** — reuse Chatwoot, Inngest, Policy Engine, Reconciler, Memory, FinOps  
2. **One GTM motion** — Diligent AI enterprise DFY; not a second mid-market product  
3. **Sequence behind traffic** — no Concierge build until staging live + committed conversational pilot  
4. **CL-030 / CL-029 / CL-036** — no campaign-workflow/reconciler validation changes; no agency `000014`; Pit Crew `/admin` still payment-gated  
5. **Shadow Mode → AI-Active → margin gate** before scale  

### Success metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Shadow draft acceptability | Client sales lead sign-off | Annotation scores |
| Qualify → CRM write latency | < 30 s p95 | `qualified_leads` + mirror |
| Escalation with context | 100% handoffs include slots + transcript | Chatwoot assignment payload |
| Gross margin / client | ≥55% | Cost-to-serve model |
| End-to-end demo thread | 1 wedge account | Attribution report |

---

## 2. Current State — What We HAVE Built (2026-07-09)

| Area | Status | Evidence |
|------|--------|----------|
| 003 OAuth / publish / worker / Chatwoot | **Done** | Production baseline |
| 004 8-agent mesh, Inngest, policy, FinOps | **Done** | Speckit 004 closed V1 |
| 005 ABM → CRM attribution | **Done** | Sprint 18–19 |
| GTM enterprise skin + Intelligence | **Done** | Sprint 2–7 |
| Inbox AI via Chatwoot | **Partial** | US-011 done; dialect quality unverified |
| WhatsApp BSP verified | **Unknown** | Open verification |
| Concierge agent (9th) | **Not built** | This feature |
| `mena_conversational_v1` | **Not built** | Phase 0 |
| Cost-to-serve + margin gate | **Not built** | Phase 0–3 |
| Production B1–B4 | **Open** | Phase D ops |

---

## 3. What We WANT to Build — Requirements

Functional requirements continue at **FR-080+**.

### 3.1 Phase 0 — De-risk & foundation

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-080 | System MUST provide `mena_conversational_v1` Policy profile (dialect register) via same Policy Engine; CRITICAL blocks remain supreme | P0 |
| FR-081 | System MUST define cost-to-serve schema (LLM + WhatsApp msg + Pit Crew labor + infra) and report gross-margin % per client | P0 |
| FR-082 | Operators MUST verify Chatwoot dialect baseline, WhatsApp BSP, Meta-gate independence, and wedge account before Phase 1 code | P0 |

### 3.2 Phase 1 — Concierge MVP + Shadow Mode

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-083 | System MUST add Concierge agent (L6): Masri qualification, slot extraction, rules-based scoring via ProviderRouter (no fine-tuning) | P0 |
| FR-084 | System MUST add Inngest `CONVERSATION_INBOUND` off existing Chatwoot → Redis → worker path | P0 |
| FR-085 | System MUST write `qualified_leads` via reconciler (additive validation only), linked to `crm_activity_mirror` | P0 |
| FR-086 | System MUST support Shadow Mode: Concierge drafts; human sends via Chatwoot | P0 |

### 3.3 Phase 2 — Escalation + HITL

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-087 | System MUST escalate on confidence/sentiment to Chatwoot human agent with full context | P0 |
| FR-088 | System MUST capture Pit Crew annotations into Memory (PG + Qdrant) | P1 |
| FR-089 | System MUST support AI-Active mode with oversight after Shadow sign-off | P0 |

### 3.4 Phase 3 — Close loop + Margin Gate

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-090 | System MUST demonstrate ABM activate → Concierge → CRM closed-won as one audited thread | P0 |
| FR-091 | System MUST enforce ≥55% gross-margin gate (FAIL = no scale) | P0 |
| FR-092 | Operators MUST produce AR/EN case study from pilot metrics | P1 |

### 3.5 Out of scope (explicit)

- New Pit Crew console UI (reuse Chatwoot)  
- Agency rollup / `000014` (A-GATE-003)  
- Fine-tuned dialect models  
- Self-serve flow builder  
- Native WhatsApp sync workers beyond Chatwoot channel (CL-038)  
- Parallel mid-market GTM product  

### Non-functional

| ID | Requirement |
|----|-------------|
| NFR-020 | Additive only — CL-030 boundary |
| NFR-021 | Cloud LLM only (Dify/OpenRouter); no Ollama on prod VPS |
| NFR-022 | All new tables RLS via `workspace_members` |
| NFR-023 | Inbound-first WhatsApp design (free service window) |

---

## 4. Dependencies & gates

| Gate | Blocks |
|------|--------|
| Phase D B1–B4 / staging live | Meaningful pilot traffic |
| Committed conversational pilot | Phase 1 Concierge build |
| Dify app published (`ai:verify`) | Inbox/Concierge LLM path |
| Shadow Mode client sign-off | AI-Active |
| Margin ≥55% | Phase 4 scale |

---

## 5. Clarifications

See [clarifications.md](./clarifications.md) (CL-048–CL-054).
