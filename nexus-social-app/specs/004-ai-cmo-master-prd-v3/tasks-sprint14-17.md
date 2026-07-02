# Tasks: Sprints 14–17 & Phases B–H

**Parent:** [tasks.md](./tasks.md) · **Plan:** [IMPLEMENT_PLAN_ALL_OPEN.md](./IMPLEMENT_PLAN_ALL_OPEN.md)

---

## Sprint 14 — Closed Loop

**Goal:** Persist learnings, Optimizer loop, FinOps + attribution runtime, durable orchestration path.

| ID | Status | Task |
|----|--------|------|
| S14-T001 | Blocked | Inngest install + API route |
| S14-T002 | To Do | Campaign → `post_id` publish pipeline |
| S14-T003 | Done (soak) | Event consumers in production worker |
| S14-T004 | To Do | MV refresh cron |
| S14-T005 | Partial | Memory repository + Optimizer agent |
| S14-T006 | Partial | FinOps runtime writes |
| S14-T007 | To Do | Attribution ingestion |
| S14-T008 | Done | Async campaign API (202 + poll) |
| S14-T009 | Done | Persist evaluations + campaign confidence |
| S14-T010 | Done (draft) | Migration 000013 draft |

### Open & partial tasks

- [ ] S14-T001 [US-001] Install Inngest + `src/app/api/inngest/route.ts` + `inngest-client.ts` — **Blocked:** CL-002, A-GATE-001 · **AC:** Inngest dev server receives functions; workflow steps registered · **Verify:** `npm run typecheck`, Inngest dev smoke · **Migration:** none · **Size:** M · **Maps:** B-ORCH-001, FR-001, FR-002

- [ ] S14-T002 [US-003] Wire reconciler campaign → `posts` → 003 publish worker — `campaign-service.ts`, `reconciler.ts`, publish queue · **AC:** `ai_cmo_campaigns.post_id` set; post enters `publish-due-posts` pipeline; per-platform status visible on campaign detail · **Verify:** `npm test -- campaign-service`; integration: campaign → scheduled post → worker log · **Migration:** none (FK exists in 000011) · **Blocker:** none (003 worker must be running) · **Size:** L · **Maps:** B-ORCH-007, FR-007

- [x] S14-T003 [FR-004] Event consumers in production worker — `src/lib/events/marketing-event-worker.ts`, `src/bin/worker.ts`, `marketing-event-dlq.ts` · **AC:** Underperforming + budget events invoke replan callback; failed events land in Redis DLQ · **Verify:** `npm run worker:dev` + `npm test -- marketing-event` · **Soak:** production consumer lag < 1 min · **Size:** M · **Maps:** B-ORCH-004 (partial)

- [ ] S14-T004 [US-006] MV refresh cron — `src/jobs/ai-cmo/refresh-mvs.ts`, register in `worker.ts` · **AC:** Hourly `REFRESH MATERIALIZED VIEW CONCURRENTLY` on `ai_cmo_cost_summary` + `ai_cmo_attribution_summary`; dashboards not stale >1h · **Verify:** `npm run worker:dev`; SQL check MV `last_refresh` · **Migration:** none · **Size:** S · **Maps:** D-FIN-004, FR-034

- [x] S14-T005 [US-005] Memory repository + Optimizer skeleton — `memory-repository.ts`, `optimizer-agent.ts`, wired in `campaign-workflow-deps.ts` · **AC:** `retrieveMemory` returns ranked learnings; Optimizer writes via reconciler · **Partial:** 000013 not applied; outcome job missing · **Verify:** `npm test -- memory-repository optimizer-agent` · **Migration:** `000013` (draft) · **Size:** M · **Maps:** C-MEM-002 (partial), C-MEM-004 (partial)

- [x] S14-T006 [US-006] FinOps runtime writes — `finops/cost-ledger.ts`, `budget-policy.ts`, Brain/Creator hooks · **AC:** Agent calls log to `ai_cmo_cost_ledger`; `checkBudgetPolicy` runs at workflow start · **Partial:** `ai_cmo_budget_policies` table not applied · **Verify:** `npm test -- cost-ledger budget-policy` · **Migration:** `000013` budget section · **Size:** M · **Maps:** D-FIN-002 (partial), D-FIN-003 (partial)

- [ ] S14-T007 [US-006] Attribution event ingestion — reconciler → `ai_cmo_attribution_events` (UTM + webhook paths) · **AC:** UTM-tagged conversion + webhook payload persisted with campaign/workspace FK · **Verify:** unit test + manual webhook POST · **Migration:** none · **Blocker:** B-ORCH-007 helpful for campaign link · **Size:** M · **Maps:** D-FIN-005, FR-033

- [x] S14-T008 [US-001] Async campaign API — `campaign-job-store.ts`, `campaigns/route.ts` (202), `campaigns/jobs/[jobId]/route.ts` · **AC:** POST returns 202 + `pollUrl`; job completes without HTTP block >30s · **Verify:** `npm test`; curl POST + poll · **Size:** M · **Maps:** B-ORCH-003, FR-001 (Redis path)

- [x] S14-T009 [US-002] Persist evaluations + campaign confidence — `campaign-workflow-deps.ts` (`persistEvaluationViaReconciler`, `updateCampaignConfidenceViaReconciler`) · **AC:** Rows in `ai_cmo_evaluations`; confidence on campaign after workflow · **Verify:** `npm test -- campaign-workflow` · **Migration:** `000013` draft · **Size:** S

- [x] S14-T010 Migration 000013 draft — `supabase/migrations/20260624_000013_ai_cmo_sprint14_draft.sql` (`decision_ledger`, `experiments`, `budget_policies`, etc.) · **AC:** File committed; **not applied** to Supabase · **Verify:** after apply `npm run schema:verify:004` extended · **Size:** S · **Maps:** C-MEM-001, D-FIN-001

**Sprint 14 exit:** Optimizer closes loop with real outcomes; cost ledger populated; attribution MV refreshed; `post_id` wired OR documented Redis-only orchestration fallback.

---

## Sprint 15 — External Intel

- [ ] S15-T001 [US-007] Radar agent — extend `listening_queries` / `mentions` → marketing event bus · **AC:** Competitor/trend signal emits typed bus event within 5 min of ingestion · **Verify:** `npm test`; worker log shows `radar.signal` · **Blocker:** S14-T003 consumers · **Size:** L · **Maps:** G-AGENT-001, FR-026

- [ ] S15-T002 [US-007] Channel Risk agent — risk heatmap API · **AC:** `GET /api/v1/ai-cmo/channel-risk` returns per-platform risk scores for workspace · **Verify:** API test · **Size:** M · **Maps:** G-AGENT-002, FR-027

- [ ] S15-T003 [US-001] Event-driven replan production — Inngest or worker bridge on underperforming + budget events · **AC:** Replan job enqueued within 1 worker cycle of event · **Verify:** publish test event → replan job exists · **Blocker:** B-ORCH-005 · **Size:** M · **Maps:** G-AGENT-007, FR-005

- [ ] S15-T004 [US-005] Competitor signal → Brain memory hook — `strategic-brain.ts` retrieves Radar learnings · **AC:** Plan JSON cites competitor context when Radar events exist · **Verify:** unit test with seeded learnings · **Blocker:** C-MEM-002 · **Size:** S · **Maps:** C-MEM-006 overlap

---

## Sprint 16 — Governance & Scale

- [ ] S16-T001 [US-009] Finance agent — Stripe pipeline attribution · **AC:** Spend rows join campaign + Stripe invoice refs · **Verify:** unit test with mock Stripe · **Blocker:** D-FIN-006 · **Size:** L · **Maps:** G-AGENT-005, FR-029

- [ ] S16-T002 [US-009] Portfolio S&OP — cross-brand budget optimizer · **AC:** API returns tradeoff scenarios for tenant with 2+ brands · **Verify:** unit test · **Size:** L · **Maps:** G-AGENT-006, FR-031

- [ ] S16-T003 [US-002] Compliance agent — MENA PDPL ruleset beyond policy-engine baseline · **AC:** Egypt DPL + PDPL rules in `policy-engine.ts`; violations audited · **Verify:** `npm test -- policy-engine` · **Size:** M · **Maps:** E-GOV-003, FR-018

- [ ] S16-T004 [US-018] Circuit breakers — `src/lib/resilience/circuit-breaker.ts` on Dify/OpenRouter · **AC:** 5 consecutive failures open circuit; half-open retry · **Verify:** `npm test -- circuit-breaker` · **Size:** M · **Maps:** F-OBS-004

- [ ] S16-T005 [US-018] AI Ops dashboard — agent metrics page (extends admin health) · **AC:** `/admin/ai-ops` shows agent latency, error rate, DLQ depth · **Verify:** manual UI + `npm run build` · **Blocker:** A-GATE-002 for Langfuse panels · **Size:** L · **Maps:** F-OBS-005, FR-041

---

## Sprint 17 — Productization & Launch

- [ ] S17-T001 [US-010] Tenant/Brand UI — settings + brand picker · **AC:** Operator switches brand; campaigns scoped to brand · **Verify:** manual UI · **Blocker:** H-PROD-001 · **Size:** L · **Maps:** H-PROD-002, FR-042

- [ ] S17-T002 [US-011] AI evaluation UI — CMO evaluation dashboard · **AC:** Lists `ai_cmo_evaluations` with dimensions + confidence band · **Verify:** manual UI · **Blocker:** E-GOV-004 · **Size:** M · **Maps:** FR-020

- [ ] S17-T003 Launch hardening — extend `LAUNCH_CHECKLIST.md` + `checklists/launch-readiness.md` · **AC:** 004 sections with verify commands · **Verify:** checklist review · **Size:** S · **Maps:** H-PROD-005

- [ ] S17-T004 [US-001] Playwright AI CMO smoke E2E — campaign workflow end-to-end · **AC:** Brief → 202 → poll → campaign row + content pieces · **Verify:** `npx playwright test` (new spec) · **Blocker:** B-ORCH-007 · **Size:** L · **Maps:** H-PROD-004

- [ ] S17-T005 [US-018] Performance gates — agent p95 <30s; reconciler <100ms · **AC:** Vitest bench or load script documents p95 · **Verify:** `npm test` perf suite · **Blocker:** F-OBS-001 · **Size:** M · **Maps:** NFR-003, NFR-004

---

## Phase B — Orchestration (B-ORCH)

| ID | Status | Task |
|----|--------|------|
| B-ORCH-001 | Open | Install Inngest + API route |
| B-ORCH-002 | Open | Port workflow to Inngest steps |
| B-ORCH-003 | Done | Async campaign API (Redis 202) |
| B-ORCH-004 | Partial | Worker marketing event consumers |
| B-ORCH-005 | Open | Event bus → orchestration bridge |
| B-ORCH-006 | Partial | Failed job DLQ |
| B-ORCH-007 | Open | Campaign → `post_id` via reconciler |
| B-ORCH-008 | Open | Deprecate legacy BRPOP queue |

- [ ] B-ORCH-001 [US-001] — Same as S14-T001 · **Owner:** Eng · **Size:** M

- [ ] B-ORCH-002 [US-001] Port `runCampaignWorkflow` to Inngest `step.run()` — `workflows/campaign-workflow.ts`, Inngest functions · **AC:** Retries 3; idempotent steps; survives worker restart · **Verify:** Inngest test harness + `npm test` · **Depends:** B-ORCH-001 · **Size:** L

- [x] B-ORCH-003 [US-001] Async campaign API — **Done** (Redis). Optional upgrade to Inngest send.

- [~] B-ORCH-004 [FR-004] Worker registers marketing event consumers — **Partial** (code done; production soak). Same as S14-T003.

- [ ] B-ORCH-005 [FR-005] Event bus → `inngest.send` replan bridge — `marketing-event-consumers.ts` · **AC:** Replan enqueued <1 cycle · **Depends:** B-ORCH-002 · **Size:** M

- [~] B-ORCH-006 [FR-003] DLQ persistence — **Partial** Redis DLQ (`marketing-event-dlq.ts`). Optional: `ai_cmo_failed_jobs` in 000013 + admin API · **Size:** M

- [ ] B-ORCH-007 [US-003] — Same as S14-T002 · **Owner:** Eng · **Size:** L

- [ ] B-ORCH-008 Deprecate `jobs/ai-orchestration.ts` BRPOP — **AC:** Single orchestration path documented; 003 publish unchanged · **Depends:** B-ORCH-002 · **Verify:** regression `npm test` · **Size:** S

---

## Phase C — Memory (C-MEM)

| ID | Status | Task |
|----|--------|------|
| C-MEM-001 | Open | Apply migration 000013 |
| C-MEM-002 | Partial | MemoryRepository hardening |
| C-MEM-003 | Open | Outcome ingestion job |
| C-MEM-004 | Partial | Optimizer production loop |
| C-MEM-005 | Open | Qdrant learning index (optional) |
| C-MEM-006 | Open | Strategy history writes |

- [ ] C-MEM-001 [US-005] Apply `20260624_000013_ai_cmo_sprint14_draft.sql` — **AC:** `schema:verify:004` passes with extended tables · **Verify:** `npm run schema:verify:004` · **Blocker:** A-GATE-003 partial · **Size:** S

- [~] C-MEM-002 [US-005] MemoryRepository production hardening — **Partial** · **AC:** Ranked learnings per workspace/brand · **Verify:** `npm test -- memory-repository` · **Depends:** C-MEM-001 · **Size:** M

- [ ] C-MEM-003 [US-005] Outcome job `post_analytics` → `ai_cmo_campaign_outcomes` — `src/jobs/ai-cmo/sync-outcomes.ts` · **AC:** ≥80% active campaigns have outcome within 48h of publish · **Verify:** job unit test + `npm run worker:dev` · **Depends:** B-ORCH-007 · **Size:** M

- [~] C-MEM-004 [US-005] Optimizer production loop — **Partial** skeleton · **AC:** ≥1 learning per completed campaign with outcome · **Depends:** C-MEM-003 · **Verify:** `npm test -- optimizer-agent` · **Size:** M

- [ ] C-MEM-005 [P] [US-005] Qdrant hybrid retrieval (L3) — vector store abstraction · **AC:** Semantic retrieval beyond SQL rank · **Size:** L · **Defer:** Sprint 15+

- [ ] C-MEM-006 [US-005] Strategy history from Brain/Optimizer — `ai_cmo_strategy_history` rows via reconciler · **Verify:** unit test · **Depends:** C-MEM-004 · **Size:** S

---

## Phase D — FinOps (D-FIN)

| ID | Status | Task |
|----|--------|------|
| D-FIN-001 | Open | Apply budget_policies (000013) |
| D-FIN-002 | Partial | Agent cost middleware complete |
| D-FIN-003 | Partial | Pre-flight budget at step 0 |
| D-FIN-004 | Open | MV refresh cron |
| D-FIN-005 | Open | Attribution ingestion |
| D-FIN-006 | Open | Unified cost view MV |

- [ ] D-FIN-001 [US-006] — Apply budget section of 000013 · **Same as** C-MEM-001 partial · **Verify:** `npm run schema:verify:004` · **Size:** S

- [~] D-FIN-002 [US-006] Agent cost middleware — **Partial** Brain/Creator hooked · **AC:** 100% agent calls log · **Verify:** `npm test -- cost-ledger` · **Size:** S

- [~] D-FIN-003 [US-006] Pre-flight budget — **Partial** stub if table missing · **AC:** 0 workflows start over cap when policies exist · **Depends:** D-FIN-001 · **Size:** S

- [ ] D-FIN-004 [US-006] — Same as S14-T004 · **Size:** S

- [ ] D-FIN-005 [US-006] — Same as S14-T007 · **Size:** M

- [ ] D-FIN-006 [US-006] Unified credit/cost MV — joins 003 `ai_credit_ledger` + 004 cost · **AC:** Single SQL view queryable · **Migration:** new MV in 000013+ · **Depends:** D-FIN-002 · **Size:** M

---

## Phase E — Governance (E-GOV)

| ID | Status | Task |
|----|--------|------|
| E-GOV-001 | Open | Approval requests table + API |
| E-GOV-002 | Open | Structured ContentPiece policy |
| E-GOV-003 | Open | Expand POLICY_RULES MENA |
| E-GOV-004 | Open | LLM-as-Judge job |
| E-GOV-005 | Open | 8-dimension schema extensions |
| E-GOV-006 | Open | Cannibalization + EEAT gates |
| E-GOV-007 | Partial | Confidence persist all campaigns |
| E-GOV-008 | Open | Approval inbox UI |

- [ ] E-GOV-001 [US-004] `ai_cmo_approval_requests` + API routes · **AC:** CRITICAL never auto-publishes; SLA fields · **Migration:** 000013+ · **Verify:** API test · **Size:** M

- [ ] E-GOV-002 [US-002] Structured `ContentPiece` extraction — replace `JSON.stringify` in policy path · **Verify:** `npm test -- policy-engine content-quality` · **Size:** M

- [ ] E-GOV-003 [US-002] — Same as S16-T003 · **Size:** M

- [ ] E-GOV-004 [US-002] LLM-as-Judge — `src/jobs/ai-cmo/llm-judge.ts` · **AC:** Post-Creator eval rows · **Depends:** B-ORCH-002 · **Size:** M

- [ ] E-GOV-005 [US-002] 8-dimension eval schema — migration extensions · **Depends:** C-MEM-001 · **Size:** S

- [ ] E-GOV-006 [US-002] Cannibalization + EEAT gates in `content-quality-engine.ts` · **Verify:** quality tests · **Size:** M

- [~] E-GOV-007 [US-002] Confidence on all campaigns — **Partial** via workflow deps · **AC:** `calibrated_confidence` on every completed campaign row · **Size:** S

- [ ] E-GOV-008 [US-004] Approval inbox UI (minimal) — settings or admin page · **Depends:** E-GOV-001 · **Size:** M

---

## Phase F — Observability (F-OBS)

| ID | Status | Owner | Task |
|----|--------|-------|------|
| F-OBS-001 | Open | Eng | OTel SDK (API + worker + agents) |
| F-OBS-002 | Open | Eng | Langfuse integration |
| F-OBS-003 | Open | Eng | Sentry agent error boundaries |
| F-OBS-004 | Open | Eng | Circuit breakers Dify/OpenRouter |
| F-OBS-005 | Open | Eng | `/admin/ai-ops` dashboard |
| F-OBS-006 | Open | Eng | Redis stream lag monitoring |
| F-OBS-007 | Open | Eng | Per-workspace rate limits |
| F-OBS-008 | Open | Eng | SLO alerting rules |

- [ ] F-OBS-001 [US-018] OTel SDK — API routes, `worker.ts`, agent modules · **AC:** Trace spans on every agent call path · **Verify:** local OTLP collector smoke · **Blocker:** A-GATE-002 · **Size:** L · **FR:** FR-039

- [ ] F-OBS-002 [US-018] Langfuse — trace export from Dify/OpenRouter calls · **AC:** LLM generations visible in Langfuse UI · **Depends:** F-OBS-001 · **Size:** M · **FR:** FR-040

- [ ] F-OBS-003 [P] [US-018] Sentry boundaries on agent executors · **AC:** Agent errors tagged `ai_cmo` without crashing worker · **Verify:** `npm test` · **Size:** S

- [ ] F-OBS-004 [US-018] — Same as S16-T004 · **Size:** M

- [ ] F-OBS-005 [US-018] — Same as S16-T005 · **Size:** L

- [ ] F-OBS-006 [US-018] Redis stream lag — monitor `marketing:events` consumer lag · **AC:** Alert when lag >1000 · **Depends:** B-ORCH-004 · **Size:** S

- [ ] F-OBS-007 [US-018] Per-workspace rate limits (service-role) · **AC:** Burst capped per workspace on AI endpoints · **Size:** M · **Gap:** C7

- [ ] F-OBS-008 [US-018] SLO alerting — p95 agent latency, DLQ depth rules · **Depends:** F-OBS-005 · **Size:** M

---

## Phase G — Agent Mesh (G-AGENT)

| ID | Status | Owner | Task |
|----|--------|-------|------|
| G-AGENT-001 | Open | Eng | Radar → event bus |
| G-AGENT-002 | Open | Eng | Channel Risk heatmap API |
| G-AGENT-003 | Open | Eng | Quant agent |
| G-AGENT-004 | Open | Eng | Sentinel anomaly detection |
| G-AGENT-005 | Open | Eng | Finance agent (Stripe) |
| G-AGENT-006 | Open | Eng | Portfolio S&OP scenarios |
| G-AGENT-007 | Open | Eng | Event-driven replan production |

- [ ] G-AGENT-001 [US-007] — Same as S15-T001 · **Depends:** C-MEM-003, D-FIN-003 · **Size:** L

- [ ] G-AGENT-002 [US-007] — Same as S15-T002 · **Size:** M

- [ ] G-AGENT-003 [US-009] Quant agent — statistical scenario modeling from analytics · **AC:** Returns confidence intervals for KPI projections · **Size:** L · **FR:** FR-030

- [ ] G-AGENT-004 [US-018] Sentinel — anomaly detection on metrics streams · **AC:** Emits bus event on anomaly · **Depends:** F-OBS-005 · **Size:** M

- [ ] G-AGENT-005 [US-009] — Same as S16-T001 · **Size:** L

- [ ] G-AGENT-006 [US-009] — Same as S16-T002 · **Size:** L

- [ ] G-AGENT-007 [US-001] — Same as S15-T003 · **Size:** M

---

## Phase H — Productization & DR (H-PROD)

| ID | Status | Owner | Task |
|----|--------|-------|------|
| H-PROD-001 | Open | Eng | Apply migration 000014 (`agencies`) |
| H-PROD-002 | Open | Eng | Tenant/agency/brand UI |
| H-PROD-003 | Open | Eng | White-label in explainability |
| H-PROD-004 | Open | Eng | Playwright AI CMO smoke E2E |
| H-PROD-005 | Open | Eng | LAUNCH_CHECKLIST extension |
| H-PROD-006 | Open | Ops+Eng | DR tabletop + Redis HA |
| H-PROD-007 | Open | Eng | Load test 500 concurrent workspaces |
| H-PROD-008 | Open | Leadership | Production readiness sign-off |

- [ ] H-PROD-001 [US-010] Apply `20260624_000014_agencies_hierarchy_draft.sql` — **AC:** `agencies` table + RLS; brands link nullable · **Verify:** `npm run schema:verify:004` · **Blocker:** A-GATE-003 · **Migration:** `000014` · **Size:** M · **FR:** FR-042 · **Gap:** C4

- [ ] H-PROD-002 [US-010] Hierarchy UI — tenant/agency/brand picker in settings · **Depends:** H-PROD-001 · **Size:** L · **Gap:** M11

- [ ] H-PROD-003 [US-010] White-label explainability — platform name/colors in `PersonaExplainabilityPanel` · **AC:** No hardcoded Nexus branding when EE custom appearance enabled · **Size:** S

- [ ] H-PROD-004 [US-001] — Same as S17-T004 · **Size:** L

- [ ] H-PROD-005 — Same as S17-T003 · **Size:** S

- [ ] H-PROD-006 [US-012] DR tabletop + Redis HA — runbook in `architecture-audit/13-disaster-recovery.md` · **AC:** RTO/RPO documented; Redis replica or Sentinel config · **Owner:** Ops + Eng · **Size:** L · **FR:** NFR-011

- [ ] H-PROD-007 [US-018] Load test 500 concurrent workspaces — script under `load-tests/` (TBD) · **AC:** p95 campaign API <30s at 500 ws · **Depends:** Phases B–F · **Size:** L · **NFR:** NFR-001

- [ ] H-PROD-008 [US-012] Production readiness sign-off — leadership checklist · **Depends:** H-PROD-004–007 · **Owner:** Leadership · **Size:** S

---

## SEO Hardening (Phase H adjunct)

From `architecture-audit/11-seo-hardening.md` — schedule in Sprint 17 or post-launch:

- [ ] H-SEO-001 [P] Programmatic SEO page generation guardrails — **Size:** L · **Defer:** post-MVP
- [ ] H-SEO-002 [P] Canonical + sitemap integration for marketing pages — **Size:** M

---

## Verification Matrix

| When | Command |
|------|---------|
| Every PR | `npm run typecheck` · `npm test` · `npm run build` |
| 003 DB | `npm run schema:verify` |
| 004 DB | `npm run schema:verify:004` |
| After 000013+ | extend `schema:verify:004` REQUIRED_TABLES |
| Staging gate | `npm run ai:verify` · `npm run verify:staging` |
| Worker features | `npm run worker:dev` |
| Full stack UAT | `npm run walkthrough` · `npm run preflight` |
| E2E | `npx playwright test` (T024, S17-T004) |
