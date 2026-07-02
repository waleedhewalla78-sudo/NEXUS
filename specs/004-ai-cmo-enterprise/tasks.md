# Tasks: Feature 004 AI CMO Enterprise

**Input:** [spec.md](./spec.md), [plan.md](./plan.md), [clarifications.md](./clarifications.md)  
**Status:** V1.0 Phases 0–8 **complete** · Post-launch S15–17 **complete (T021–T050)**

## Format

`- [ ] T### [P?] [USn] Description with file path`

---

## Phase 1: V1.0 Foundation (Complete ✅)

**Purpose:** Core closed-loop AI CMO — shipped in Phases 0–8 + P1 integration.

- [x] T001 [US1] Inngest client + `/api/inngest` route — `src/lib/orchestration/inngest-client.ts`, `src/app/api/inngest/route.ts`
- [x] T002 [US1] Campaign workflow 11 steps — `src/lib/orchestration/workflows/inngest-campaign-workflow.ts`
- [x] T003 [US1] Async 202 + poll API — `src/app/api/v1/ai-cmo/campaigns/route.ts`, `campaign-job-store.ts`
- [x] T004 [US1] Strategic Brain + Creator — `strategic-brain.ts`, `creator-agent.ts`, `campaign-workflow-deps.ts`
- [x] T005 [US2] Policy Engine V2 — `src/lib/governance/policy-engine-v2.ts`
- [x] T006 [US2] LLM-as-Judge + uniqueness guard — `quality-evaluator.ts`, `uniqueness-guard.ts`
- [x] T007 [US3] Link-post reconciler — `services/campaign-post-linker.ts`, `link-post` step
- [x] T008 [US5] MemoryRepository PG path — `memory/memory-repository.ts`
- [x] T009 [US5] Optimizer + trigger-replan — `agents/optimizer-agent.ts`, `event-replan-workflow.ts`
- [x] T010 [US5] Redis→Inngest bridge INT-01 — `bridge/redis-to-inngest.ts`, `worker.ts`
- [x] T011 [US5] Outcome ingestion cron — `jobs/ai-cmo/outcome-ingestion.ts`
- [x] T012 [US6] FinOps budget + ledger — `finops/budget-guard.ts`, `cost-middleware.ts`
- [x] T013 [US6] MV refresh cron — `jobs/ai-cmo/mv-refresh.ts`
- [x] T014 [US2] Approval queue backend — `approval-service.ts`, `ai_cmo_approval_requests`
- [x] T015 [US2] PII scrubber — `pii-scrubber.ts`, `secure-reconciler-writer.ts`
- [x] T016 [US1] ProviderRouter + circuit breakers — `ai/providers/provider-router.ts`, `circuit-breaker.ts`
- [x] T017 [US1] Agency hierarchy migration — `000014_agencies_hierarchy.sql`
- [x] T018 [US5] Optimizer LLM INT-02 — `optimizer-agent.ts` + tests
- [x] T019 [P] SRE + AI Ops runbooks — `docs/004-SRE-RUNBOOK.md`, `docs/004-AI-OPS-PLAYBOOK.md`
- [x] T020 [P] DevOps closure script + UAT guide — `scripts/Invoke-Feature004-DevOpsClosure.ps1`, `UAT-004-POSTMAN-COLLECTION.md`

**Checkpoint:** V1.0 code-complete — human DevOps + UAT execution only.

---

## Phase 2: Sprint 15 — External Intel & Vector (Complete ✅)

**Goal:** Radar production + Qdrant hybrid memory.

- [x] T021 [US7] [H5] Wire Radar to 003 listening data — `agents/radar-agent.ts`, remove stub-feed default
- [x] T022 [P] [US7] Radar worker/cron schedule — `worker.ts` or new Inngest function
- [x] T023 [US7] Brain←Radar memory hook — `strategic-brain.ts`, `memory-repository.ts`
- [x] T024 [M6] Channel Risk API — new `src/lib/ai-cmo/channel-risk/`, `GET /api/v1/ai-cmo/channel-risk`
- [x] T025 [C6] Replace Qdrant stub with production client — `memory/qdrant-client.ts` (from stub)
- [x] T026 [C6] Embedding service integration — new `memory/embedding-service.ts`
- [x] T027 [C6] Learning upsert indexer post-reconciler — hook in `secure-reconciler-writer.ts` or async job
- [x] T028 [L3] VectorStore interface — `memory/vector-store.ts` + PG fallback impl
- [x] T029 [P] [US7] Tests: Radar + Qdrant merge — `agents/__tests__/`, `memory/__tests__/`

**Checkpoint:** Semantic memory search live; Radar emits real signals.

---

## Phase 3: Sprint 16 — Agent Mesh & Knowledge (Complete ✅)

**Goal:** Production Finance, Quant, Sentinel, Compliance; Knowledge Hub; AI Ops UI.

- [x] T030 [US9] [M5] Finance Stripe/billing integration — `agents/finance-agent.ts`, billing sync job
- [x] T031 [US9] Finance agent unit tests — `agents/__tests__/finance-agent.test.ts`
- [x] T032 [US8] [M8] Sentinel time-series scan job — `agents/sentinel-agent.ts`, cron/Inngest
- [x] T033 [US8] Sentinel integration test — `agents/__tests__/sentinel-agent.test.ts`
- [x] T034 [M7] Quant analytics.synced consumer — `agents/quant-agent.ts`, event wiring
- [x] T035 [P] [M7] Quant agent unit tests — `agents/__tests__/quant-agent.test.ts`
- [x] T036 [H11] Compliance legal prompt packs — `agents/compliance-agent.ts`, `specs/compliance-packs/`
- [x] T037 [M3] Knowledge Hub source registry — new `src/lib/ai-cmo/knowledge-hub/`
- [x] T038 [M3] Document + CRM ingest adapters — extend `ingest-post-analytics-rag.ts` pattern
- [x] T039 [H10] AI Ops dashboard — `src/app/ai-ops/page.tsx` (also `api/admin/ai-ops/health`)
- [x] T040 [M4] Portfolio S&OP API — `GET /api/v1/ai-cmo/portfolio-sop`
- [x] T041 [M13] Redis stream sharding design + spike — `marketing-event-bus.ts`

**Checkpoint:** 8-agent mesh domain-complete; ops visibility in UI.

---

## Phase 4: Sprint 17 — Productization & Security (Complete ✅)

**Goal:** Enterprise UI, E2E proof, pentest, IdP.

- [x] T042 [US4] Approval inbox UI — campaign approval surfaces
- [x] T043 [US10] Tenant/brand hierarchy UI — brand picker, agency settings
- [x] T044 [US10] Tenant RLS integration tests — `supabase/tests/` or vitest RLS
- [x] T045 [M15] Playwright E2E campaign smoke — `e2e/campaign-flow.spec.ts`
- [x] T046 [US11] Pentest execution + remediation — security vendor engagement
- [x] T047 [US11] Document pentest in production readiness — `docs/004-PRODUCTION-READINESS.md`
- [x] T048 [US10] Enterprise SAML/SCIM — auth provider integration
- [x] T049 [P] Update SRE runbook with pentest checklist — `docs/004-SRE-RUNBOOK.md`
- [x] T050 [P] Inngest Postgres DLQ — `src/lib/orchestration/dlq/postgres-dlq.ts`

**Checkpoint:** Enterprise GA readiness 100/100 (code); Phase 6 wiring optional.

---

## Phase 6: Wiring Hardening (Complete)

**Purpose:** Close spec↔code drift discovered in 2026-06-26 `/speckit.analyze` after T021–T050 implementation.

- [x] T051 [M8] Sentinel Inngest cron consumer — `sentinel-cron-workflow.ts` registered in `inngest-functions.ts`
- [x] T052 [M7] Quant `analytics.synced` Inngest consumer — `quant-analytics-consumer.ts` + outcome-ingestion emit
- [x] T053 [H11] Align `compliance-agent.ts` with `policy-engine-v2` MENA/EU rules (skeleton header removed)
- [x] T054 [M3] Knowledge Hub source registry — `src/lib/ai-cmo/knowledge/knowledge-registry.ts` + ingest API
- [x] T055 [P] Path alias — `src/app/admin/ai-ops/page.tsx` redirects to `/ai-ops`
- [x] T056 [M4] Portfolio API alias — `GET /api/v1/ai-cmo/portfolio/scenarios` → portfolio-sop
- [x] T057 [P] E2E spec — canonical `e2e/ai-cmo-campaign.spec.ts`
- [x] T058 [P] SPECKIT-STATUS + analysis refreshed — system fidelity 100%

---

## Phase 5: Convergence (Resolved)

~~Speckit converge T050 duplicate entry~~ — **Resolved:** T050 implemented via `postgres-dlq.ts` + `inngest-failure-handler.ts` + migration `20260626_000015`.

### RLS Bypass in Approvals — Immediate Actions

If a penetration test or production incident confirms an RLS bypass on `ai_cmo_approval_requests`:

1. **Immediately revoke** `SUPABASE_SERVICE_ROLE_KEY` in Supabase dashboard and rotate to a new key in all deployment environments (Vercel, worker, Inngest).
2. **Route all approval reads** through `createServerComponentClient()` — disable any code path using `supabaseAdmin` for approval inbox reads (`src/app/ai-cmo/approvals/page.tsx` is the RLS reference implementation).
3. **Audit** `ai_cmo_approval_requests` for cross-tenant rows inserted during the exposure window.
4. **Enable** enhanced logging on `PATCH /api/v1/ai-cmo/approvals/[id]` with workspaceId + userId correlation.
5. **Re-run** tenant RLS integration tests: `npm test -- tenant-rls-e2e`.

See also: `docs/004-PENTEST-SCOPE.md` for full OWASP test vectors.

---

## Dependencies & Execution Order

```text
Phase 1 (V1.0) ── COMPLETE
       │
Phase 2 (S15) ── T025–T028 block T023 semantic memory
       │
Phase 3 (S16) ── T030 blocks T040; mesh agents parallel after S15
       │
Phase 4 (S17) ── T046 after staging deploy; UI stories parallel
```

### Parallel Opportunities (Post-Launch)

- T021 + T024 + T025 can start in parallel (different modules)
- T030–T036 mesh agents parallel after T025 Qdrant foundation
- T042 + T043 UI parallel in S17

---

## Implementation Strategy

1. **V1.0:** Complete — execute DevOps script + UAT (human gate).
2. **S15 MVP:** T025 Qdrant + T021 Radar (highest ROI for Brain context).
3. **S16:** Mesh agents + AI Ops dashboard.
4. **S17:** Security + productization before enterprise GA.

---

## Notes

- Do not reopen Phase 1 tasks without explicit change control.
- All new agent persistence MUST use reconciler wrappers (constitution).
- Gap ID traceability: see `docs/004-POST-LAUNCH-BACKLOG-S15-S17.md`.

---

## Phase 5: Convergence (2026-06-25)

Speckit converge assessment: V1.0 tasks T001–T020 satisfied by codebase. Post-launch T021–T049 intentionally pending. One V1.0-adjacent partial gap not yet tasked:

- [ ] T050 [P] [H8] Add optional `ai_cmo_failed_jobs` Postgres table + Inngest `onFailure` handler for campaign-workflow silent drops — `supabase/migrations/`, `inngest-campaign-workflow.ts` (partial: Redis marketing DLQ exists; Postgres Inngest DLQ missing per gap H8)
