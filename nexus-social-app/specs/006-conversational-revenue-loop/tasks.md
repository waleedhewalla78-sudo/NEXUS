# Feature 006 — Tasks

**Created:** 2026-07-09 (`/speckit.tasks`)  
**Source of truth for `/speckit.implement`**

Legend: `[x]` done · `[ ]` open · `[~]` blocked/gated

---

## Phase 0 — De-risk & foundation (ungated)

- [x] **T001** Author `specs/006-conversational-revenue-loop/spec.md` + user stories
- [x] **T002** Record CL-048–CL-054 in `clarifications.md`
- [x] **T003** Author `plan.md` (9-layer additive map)
- [x] **T004** Implement `mena_conversational_v1` compliance profile + unit tests (FR-080 / US-080)
- [x] **T005** Implement cost-to-serve + margin gate calculator + unit tests (FR-081 / US-081)
- [x] **T006** Amend CONSTITUTION.md for Feature 006 (v1.5.0)
- [x] **T007** Write `SPECKIT-STATUS.md` + `analysis.md` for this track
- [x] **T008** Create GitHub issues for open 006 tasks (label `feature-006`) — #31–#35
- [~] **T009** Complete human verification V1–V4 (US-082) — **operator**

---

## Phase 1 — Concierge MVP + Shadow

**Sprint plan:** [phase-1-sprints.md](./phase-1-sprints.md) (S1–S4)  
**Founder authorized eng start 2026-07-09** (Hermes skipped; V1–V4 + Dify remain parallel ops).

### Sprint 1 — Foundation ✅

- [x] **T010** Migration `20260720_conversation_qualification_tables.sql` + RLS
- [x] **T011** Extend `AgentName` + Concierge agent scaffold (FR-083) — rules-based; LLM in S3
- [x] **T013** Reconciler path for `qualified_leads` + qualification tables (FR-085) — schemas + persist helpers
- [x] **T014** Shadow Mode workspace config helper (FR-086) — default `shadow`
- [x] **T015a** Unit tests Sprint 1 foundation (slots, concierge, reconciler schemas, mesh)

### Sprint 2–4 ✅

- [x] **T012** Inngest `CONVERSATION_INBOUND` + Chatwoot fan-out + inbound API — **Sprint 2**
- [x] **T011b** ProviderRouter Concierge LLM path + accountDomain — **Sprint 3**
- [x] **T015b** Harden tests + UAT checklist — **Sprint 4**
- [x] **T015** Unit tests Phase 1 (26 passing)

---

## Phase 2 — Escalation + AI-Active ✅

- [x] **T016** Escalation engine → Chatwoot assignment with context (FR-087)
- [x] **T017** Annotation capture → Memory/Qdrant (FR-088)
- [x] **T018** AI-Active mode flip + oversight runbook (FR-089)

---

## Phase 3 — Close loop + Margin Gate ✅

- [x] **T019** Wire ABM activate → Concierge → attribution demo thread (FR-090)
- [x] **T020** Margin gate report + FAIL stop-scale (FR-091)
- [x] **T021** AR/EN case study pack (FR-092) — checklist + generators (commercial fill)
- [x] **T023** Persist cost-to-serve monthly snapshots (table + reconciler)

---

## Convergence append (2026-07-09)

- [x] **T022** Confirm Settings → Compliance UI lists `mena_conversational_v1` from catalog (smoke)
- [x] **T023** Persist cost-to-serve monthly snapshots — with T020

---

## Parallel (not 006 code — Phase D)

- [~] **PD-OPS** B1–B4, Hermes (**skipped**), secrets — see program issues #20–#30
- [~] **A-GATE-005** Publish Dify app; `npm run ai:verify` — key valid, publish pending (exit 2)
- [~] **T009** V1–V3 human samples; **V4** defaulted to CL-050 ABM wedge ✅
- [~] **DB** Apply `20260720` + `20260721` via SQL Editor if `npm run db:apply-006` DNS fails

**Finish pack:** [checklists/finish-line-ops.md](./checklists/finish-line-ops.md)

---

## Dependency order

```
T001–T003 → T004–T007 → T008
T009 (human) ─┐
PD-OPS + Dify ─┼→ unlock T010–T015 → T016–T018 → T019–T021
```
