# Tasks: AI CMO PRD v3.0

**Input**: [spec.md](./spec.md), [plan.md](./plan.md), [IMPLEMENT_PLAN_ALL_OPEN.md](./IMPLEMENT_PLAN_ALL_OPEN.md), [clarifications.md](./clarifications.md)

**Prerequisites**: Feature 003 launch-ready baseline (no regression)

> **GitHub issue tracking (2026-06-23):** Issues not created in this environment (gh CLI unavailable). Run `scripts/create-github-issues-from-tasks.ps1` from repo root after `gh auth login`; backlog in [issues-backlog.md](./issues-backlog.md). Issue numbers `(#NNN)` will be appended when `-UpdateTasksMd` is used.


**Detailed Sprints 14â€“17 + Phases Bâ€“H**: [tasks-sprint14-17.md](./tasks-sprint14-17.md)

---

## Summary

| Status | Count | Notes |
|--------|-------|-------|
| **Complete** | 29 | Sprint 12 (12) + Sprint 13 code (11) + Sprint 14 delivered (6) |
| **In Progress** | 5 | Sprint 14 partial (soak / 000013 not applied) |
| **Blocked** | 2 | S14-T001 (CL-002), S13-T012 / A-GATE-004 (operator) |
| **Deferred** | 1 | 003 T024 â€” see cross-track link |
| **To Do** | 52 | Sprint 14 open + Sprints 15â€“17 + Phases Aâ€“H open |

*Phase task IDs (Bâ€“H) overlap sprint IDs where noted; counts above use sprint-level IDs as primary.*

**Last updated:** 2026-06-24 آ· Subagent `133c587c` partial Sprint 14 skeleton reflected

---

## Format

`[ID] [P?] [Story] Description` â€” paths, acceptance criteria, verify command, migration, blocker, size (S/M/L)

---

## Sprint 12: Foundation â€” COMPLETE

**Verify (2026-06-24):** `npm run typecheck && npm test && npm run build && npm run schema:verify:004` â†’ 11/11 after 000011+000012 applied

- [x] T001 [US-001] Productization hierarchy â€” `tenants`, `workspaces.tenant_id`, `brands`, `ai_cmo_campaigns` + RLS + backfill آ· migration `20260624_000011_ai_cmo_hierarchy.sql` آ· **Verify:** `npm run schema:verify:004`
- [x] T002 [P] Event bus â€” `src/lib/events/marketing-event-bus.ts` (Redis Streams, typed events, idempotency) آ· **Verify:** `npm test -- marketing-event-bus`
- [x] T003 [US-003] SoR/SoI reconciler â€” `src/lib/sync/reconciler.ts` (validate, RLS, audit, atomic write) آ· **Verify:** `npm test -- reconciler`
- [x] T004 Orchestration skeleton â€” `src/lib/orchestration/` (Inngest stub + `campaign-workflow.ts`) آ· CL-002 documented in README
- [x] T005 Memory layer schema â€” `ai_cmo_learnings`, `ai_cmo_campaign_outcomes`, `ai_cmo_strategy_history` in `000012`
- [x] T006 FinOps schema â€” `ai_cmo_cost_ledger`, `ai_cmo_cost_summary` MV in `000012`
- [x] T007 Attribution schema â€” `ai_cmo_attribution_events`, `ai_cmo_attribution_summary` MV in `000012`
- [x] T008 AI evaluations schema â€” `ai_cmo_evaluations`, `ai_cmo_content_pieces`, `ai_cmo_strategies` in `000012`
- [x] T009 [US-002] Policy engine + calibrated confidence â€” `policy-engine.ts`, `calibrated-confidence.ts` آ· **Verify:** `npm test -- policy-engine`
- [x] T010 Content quality engine â€” `content-quality-engine.ts` آ· **Verify:** `npm test -- content-quality-engine`
- [x] T011 [P] Unit tests â€” event-bus, reconciler, policy-engine, calibrated-confidence, content-quality-engine
- [x] T012 Gate â€” `npm run typecheck && npm test && npm run build && npm run schema:verify`

---

## Sprint 13: Core Value

- [x] S13-T001 [US-001] Dify runtime client â€” `src/lib/dify/client.ts` (agent execution only, not orchestrator) آ· **Verify:** unit tests in `test/lib/dify/`
- [x] S13-T002 [US-001] Strategic Brain agent â€” `src/lib/ai-cmo/strategic-brain.ts` with Dify + OpenRouter fallback آ· **AC:** structured plan JSON with horizon + channels
- [x] S13-T003 [US-001] Creator agent â€” `src/lib/ai-cmo/creator-agent.ts` آ· **AC:** caption, hashtags, platforms from plan
- [x] S13-T004 [US-001] Calibrated confidence in API â€” `POST /api/v1/ai-cmo/confidence` + workflow wiring
- [x] S13-T005 [US-001] Persona explainability â€” `src/lib/explainability/renderer.ts`, `PersonaExplainabilityPanel`
- [x] S13-T006 [US-003] Reconciler write path â€” `src/lib/ai-cmo/campaign-service.ts` (campaigns + content pieces)
- [x] S13-T007 [US-001] Orchestration deps â€” `src/lib/orchestration/campaign-workflow-deps.ts`
- [x] S13-T008 [FR-004] Event consumers â€” `marketing-event-consumers.ts` (underperforming + budget threshold)
- [x] S13-T009 [US-001] Campaign API â€” `POST/GET /api/v1/ai-cmo/campaigns`
- [x] S13-T010 [P] Unit tests for all Sprint 13 modules آ· **Verify:** `npm test`
- [x] S13-T011 Apply migration 000012 in Supabase â€” `schema:verify:004` 11/11 (2026-06-24)
- [ ] S13-T012 [US-001] Publish Dify Strategic Brain + Creator apps آ· **Owner:** Operator آ· **Blocker:** Dify Studio publish آ· **Verify:** `npm run ai:verify` (exit 0) آ· **Size:** S آ· Maps A-GATE-004

---

## Phase A â€” Leadership Gates

| ID | Task | Owner | Status | Blocker |
|----|------|-------|--------|---------|
| A-GATE-001 | Inngest approval + Cloud account (CL-002) | Eng Leadership | Open | Leadership sign-off |
| A-GATE-002 | Langfuse self-host vs Cloud decision | CIO | Open | Leadership |
| A-GATE-003 | Agency hierarchy sign-off (`000014`) | Product + Eng | Open | Product |
| A-GATE-004 | Dify Brain + Creator publish (`S13-T012`) | Operator | Open | Dify Studio |
| A-GATE-005 | PDPL data flow review (memory/FinOps) | Security | Open | Security review |

**Exit:** Decision log in `implementation-plan.md` Leadership Decisions table; A-GATE-001 unblocks B-ORCH-001â€“005.

---

## Feature 003 Cross-Track (separate file â€” do not duplicate)

Launch blockers and UAT live in the repo-root 003 task list. **Do not re-create T001â€“T062 here.**

| ID | Summary | Status | Link |
|----|---------|--------|------|
| T024 | Playwright E2E schedule â†’ publish | Deferred | [003 tasks.md آ§T024](../003-real-integrations-production/tasks.md) |
| T053 | Phase 1 UAT OAuth â†’ live publish | To Do | [003 tasks.md آ§T053](../003-real-integrations-production/tasks.md) |
| T054 | CI schema gate on `main` | To Do | [003 tasks.md آ§T054](../003-real-integrations-production/tasks.md) |
| T055 | Phase 2 analytics truth smoke | To Do | [003 tasks.md آ§T055](../003-real-integrations-production/tasks.md) |
| T056 | Full-stack walkthrough | To Do | [003 tasks.md آ§T056](../003-real-integrations-production/tasks.md) |
| T057 | Meta App Review production publish | Blocked | [003 tasks.md آ§T057](../003-real-integrations-production/tasks.md) |

**003 dependency for 004:** `B-ORCH-007` / `S14-T002` requires 003 publish worker (`src/bin/worker.ts`, `src/jobs/publish-due-posts.ts`).

**Verify:** `npm run verify:staging` آ· `LAUNCH_CHECKLIST.md`

---

## Sprints 14â€“17 & Phases Bâ€“H

Full actionable breakdown with acceptance criteria, verify commands, migrations, and partial/done markers:

â†’ **[tasks-sprint14-17.md](./tasks-sprint14-17.md)**

Includes: Sprint 14 (closed loop) آ· Sprint 15 (external intel) آ· Sprint 16 (governance & scale) آ· Sprint 17 (productization) آ· Phase B Orchestration آ· Phase C Memory آ· Phase D FinOps آ· Phase E Governance آ· Phase F Observability آ· Phase G Agent mesh آ· Phase H Productization & DR

---

## Traceability Appendix (selected)

| Task ID | User Story | FR | Phase | Primary paths |
|---------|------------|-----|-------|---------------|
| T001â€“T012 | US-001, US-002, US-003 | FR-008, FR-016â€“FR-023 | Sprint 12 | `supabase/migrations/20260624_000011*`, `000012*` |
| S13-T001â€“T011 | US-001 | FR-024, FR-025, FR-022 | Sprint 13 | `src/lib/ai-cmo/*`, `src/app/api/v1/ai-cmo/*` |
| S13-T012 | US-001 | FR-024, FR-025 | A | Dify Studio |
| S14-T001 | US-001 | FR-001, FR-002 | B | `src/app/api/inngest/route.ts` |
| S14-T002 | US-003 | FR-007 | B | `campaign-service.ts`, `reconciler.ts` |
| S14-T003 | â€” | FR-004, FR-005 | B | `marketing-event-worker.ts`, `worker.ts` |
| S14-T004 | US-006 | FR-034 | D | `src/jobs/ai-cmo/refresh-mvs.ts` |
| S14-T005 | US-005 | FR-009, FR-011 | C | `memory-repository.ts`, `optimizer-agent.ts` |
| S14-T006 | US-006 | FR-032, FR-035 | D | `finops/cost-ledger.ts`, `budget-policy.ts` |
| S14-T007 | US-006 | FR-033 | D | `ai_cmo_attribution_events` ingestion |
| S14-T008 | US-001 | FR-001 | B | `campaign-job-store.ts`, `campaigns/jobs/` |
| B-ORCH-007 | US-003 | FR-007 | B | Same as S14-T002 |
| C-MEM-003 | US-005 | FR-010 | C | `src/jobs/ai-cmo/sync-outcomes.ts` |
| E-GOV-001 | US-004 | FR-019 | E | `ai_cmo_approval_requests` API |
| F-OBS-001â€“008 | US-018 | FR-039â€“FR-041 | F | OTel, Langfuse, `/admin/ai-ops` |
| G-AGENT-001â€“007 | US-007â€“US-009 | FR-026â€“FR-031 | G | Radar, Channel Risk, Finance agents |
| H-PROD-001â€“008 | US-010â€“US-012 | FR-042â€“FR-055 | H | `000014`, hierarchy UI, DR, load test |

Full matrix: [user-stories.md](./user-stories.md) آ· [spec.md آ§3](./spec.md)

---

## Regression Guardrails

- Do not modify OAuth, publish adapters, or webhook handlers except via `B-ORCH-007` / `S14-T002` post link
- New tables additive; `schema:verify` REQUIRED_TABLES unchanged until explicitly extended
- Every PR: `npm run typecheck` آ· `npm test` آ· `npm run build`
