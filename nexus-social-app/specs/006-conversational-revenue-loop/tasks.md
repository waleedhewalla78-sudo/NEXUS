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

## Phase 1 — Concierge MVP + Shadow (gated CL-052)

- [~] **T010** Migration `20260720_conversation_qualification_tables.sql` + RLS
- [~] **T011** Extend `AgentName` + Concierge agent scaffold (FR-083)
- [~] **T012** Inngest `CONVERSATION_INBOUND` function (FR-084)
- [~] **T013** Reconciler path for `qualified_leads` (FR-085)
- [~] **T014** Shadow Mode workspace flag + draft-only path (FR-086)
- [~] **T015** Unit/integration tests for Concierge + Shadow

**Unblock when:** staging healthy + committed conversational pilot + Dify published.

---

## Phase 2 — Escalation + AI-Active

- [~] **T016** Escalation engine → Chatwoot assignment with context (FR-087)
- [~] **T017** Annotation capture → Memory/Qdrant (FR-088)
- [~] **T018** AI-Active mode flip + oversight runbook (FR-089)

---

## Phase 3 — Close loop + Margin Gate

- [~] **T019** Wire ABM activate → Concierge → attribution demo thread (FR-090)
- [~] **T020** Margin gate report + FAIL stop-scale (FR-091)
- [~] **T021** AR/EN case study pack (FR-092) — commercial

---

## Convergence append (2026-07-09)

- [ ] **T022** Confirm Settings → Compliance UI lists `mena_conversational_v1` from catalog (smoke)
- [~] **T023** Persist cost-to-serve monthly snapshots (table + reconciler) — with T020

---

## Parallel (not 006 code — Phase D)

- [~] **PD-OPS** B1–B4, Hermes, secrets — see program issues #20–#30
- [~] **A-GATE-005** Publish Dify app; `npm run ai:verify`

---

## Dependency order

```
T001–T003 → T004–T007 → T008
T009 (human) ─┐
PD-OPS + Dify ─┼→ unlock T010–T015 → T016–T018 → T019–T021
```
