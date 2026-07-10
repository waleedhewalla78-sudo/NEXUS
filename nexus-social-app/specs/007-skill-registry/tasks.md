# Feature 007 — Tasks

**Created:** 2026-07-10 (`/speckit.tasks`)  
Legend: `[x]` done · `[ ]` open · `[~]` gated

---

## Phase 0 — Commercial + Speckit (ungated)

- [x] **T001** Author `spec.md` + user stories
- [x] **T002** Record CL-055–CL-057 in `clarifications.md`
- [x] **T003** Author `plan.md`
- [x] **T004** Amend CONSTITUTION.md v1.5.1 for Feature 007
- [x] **T005** Write `SPECKIT-STATUS.md` + `analysis.md`
- [x] **T006** Strategy Audit offer pack EN + AR (commercial templates)
- [x] **T007** Delivery checklist for manual audit
- [x] **T008** Create GitHub issues (label `feature-007`) — #36–#39
- [ ] **T009** Human V7-1–V7-3 (prospect, pricing, pilot WS) — **operator**

---

## Phase 1 — Registry MVP (gated CL-055)

- [~] **T010** Migration `skills` / `skill_versions` / `skill_runs` + RLS
- [~] **T011** Reconciler schemas + persist helpers
- [~] **T012** Inngest `SKILL_REQUESTED` + API 202/poll
- [~] **T013** `brand_voice` + `strategy_audit` skill runners
- [~] **T014** Unit tests Phase 1

---

## Phase 2 — Voice mesh

- [~] **T015** Load Brand Voice into Creator + Concierge context
- [~] **T016** Arabic humanizer pattern pack (versioned)

---

## Phase 3 — GEO + connectors

- [~] **T017** GEO audit async job + export
- [~] **T018** MCP connector verify (reuse OAuth vault)

---

## Dependency order

```
T001–T005 → T006–T008 (Phase 0)
T009 (human) + paying pilot ─┐
CL-055 ──────────────────────┼→ unlock T010–T014 → T015–T018
```
