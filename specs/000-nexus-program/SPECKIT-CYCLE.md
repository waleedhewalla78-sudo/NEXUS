# Nexus Program — Full Speckit Cycle

**Date:** 2026-07-03  
**Workspace:** `e:\nexus-social-platform\nexus-social-app`  
**GitHub:** `waleedhewalla78-sudo/NEXUS` @ `main` (`72f7b91`)  
**Verdict:** **CODE COMPLETE — CONDITIONAL PROD** (Section B human gates open)

---

## Verification snapshot (this run)

```text
npm run typecheck        → PASS
npm run test:unit        → 239 passed | 1 skipped
npm run uat:check-schema → 13/13 OK (incl. abm_playbook_runs)
npm run verify:abm-seed  → PASS (activate 202, control plane 200)
npm run verify:production:code → PASS (prior run)
Postman A/B              → PASS (2026-06-30)
live integration         → 5/5 (2026-06-30)
```

---

## `/speckit.constitution` — Governing principles

**Canonical:** [`nexus-social-app/CONSTITUTION.md`](../../nexus-social-app/CONSTITUTION.md) **v1.3.0**

### Core mandates

| Area | Rule |
|------|------|
| **SoR / SoI** | Agents and Dify never write SoR; all mutations via `reconciler.ts` + domain services |
| **Dify** | Runtime only (RAG, chat, generation) — orchestration is Inngest + Redis Streams |
| **Multi-tenant** | RLS on every tenant table before API routes |
| **AI governance** | Risk tier + policy determine approval — never LLM confidence alone |
| **003 regression** | OAuth, publish, webhooks, worker loops stay green on every commit |
| **Speckit artifacts** | `tasks.md` is source of truth per feature; constitution wins over PRD prose |
| **Pre-task gate** | `typecheck` + `npm test` + `schema:verify` (+ `schema:verify:004` for 004 work) |

### Hard blocks (do not ship without gate)

- Demo analytics in production (`DEMO_ANALYTICS_ENABLED=false`)
- Tables without RLS
- Meta publish before `meta_app_review_status = approved`
- Sprint 20 / Agency UI / migration `000014` without **A-GATE-003**
- Modify `campaign-workflow.ts` step order, `reconciler.ts` validation, Meta/LinkedIn webhook auth (**CL-030**)
- Hostinger VPS Track 2 — **PAUSED** (**DEC-006**)

### Feature tracks

| Feature | Focus | Status |
|---------|-------|--------|
| **003** | OAuth, publish, analytics, worker, webhooks | Production baseline (Sprints 1–11) |
| **004** | AI CMO — 8 agents, Inngest mesh, policy, FinOps, memory | Additive (Sprint 12+) — 58/58 tasks |
| **005** | ABM, CRM loop, MENA compliance, control plane | Sprint 18–19 **shipped**; Sprint 20 blocked |

---

## `/speckit.specify` — What we build / want to build

**Program spec:** [`spec.md`](./spec.md)  
**Master PRD:** [`docs/NEXUS-MASTER-PRD.md`](../../nexus-social-app/docs/NEXUS-MASTER-PRD.md) v2.1.0

### Shipped (as-built)

**003 — Real Integrations Production**

- OAuth + encrypted token vault
- Publish: Facebook, Instagram, LinkedIn, X
- Schedule + worker publish loop
- Analytics sync, listening, Chatwoot inbox AI
- Webhooks + marketing event bus

**004 — AI CMO Enterprise**

- Async campaigns (202 + poll), Inngest 8-function mesh
- Strategic Brain → Creator → Judge → link-post
- Policy Engine V2, approval queue, FinOps ledger
- Memory (PG + Qdrant), 8 agents, ProviderRouter + circuit breakers
- Channel risk API with liveSignals (S15 partial)

**005 — Enterprise Revenue Loop**

- ABM dashboard + playbook activation (`abm_playbook_runs`)
- HubSpot + Salesforce inbound webhooks; `sync:hubspot-deals`
- CRM domain attribution + executive export
- MENA compliance profile + `/settings/compliance`
- Control plane + last-audit per agent

**Ops close-out (Track 1)**

- `.env.production.template`, 8× `docs/OPS-*.md`, `GATES-REMAINING.md`
- `verify:production:*` scripts; CI `schema-gate` on `main`

### Remaining requirements

| Priority | ID | Requirement | Acceptance |
|----------|-----|-------------|------------|
| **P0** | FR-D01 | Live integration 5/5 | `npm run test:live-integration` |
| **P0** | FR-D02–D03 | Postman A/B | `npm run uat:postman-ab` |
| **P0** | FR-D04 | OAuth UAT T053–T056 | [`OPS-OAUTH-UAT-RUNBOOK.md`](../../nexus-social-app/docs/OPS-OAUTH-UAT-RUNBOOK.md) |
| **P0** | FR-D05 | Executive sign-off | [`UAT-SIGNOFF-RESULTS.md`](../../nexus-social-app/docs/UAT-SIGNOFF-RESULTS.md) |
| **P0** | B4–B6 | Prod secrets, staging gates, E2E/k6 | [`GATES-REMAINING.md`](../../nexus-social-app/docs/GATES-REMAINING.md) |
| **P1** | FR-070–072 | Agency command center | Blocked **A-GATE-003** / `000014` |
| **P1** | #14 | HubSpot full OAuth (stub today) | Settings UI + token flow |
| **P2** | FR-P01 | TikTok/Snapchat live publishers | Enum + graceful skip today |
| **P2** | S15–S17 remainder | Radar live, eval UI, Playwright AI CMO E2E | Post-pilot backlog |

### Consolidated user stories (selected)

| ID | Story | Track | Status |
|----|-------|-------|--------|
| US-001 | Operator schedules post → worker publishes | 003 | ✅ |
| US-002 | API triggers AI campaign → completed job | 004 | ✅ |
| US-003 | Compliance blocks CRITICAL content | 004 | ✅ |
| US-006 | Budget cap blocks spend | 004 | ✅ UAT |
| US-012 | Executive brief → campaign | 005 | ✅ |
| US-026–028 | ABM live API, explainability, seed | 005 | ✅ |
| US-029 | Activate playbook → campaign job | 005 | ✅ |
| US-030 | CRM closed-loop attribution | 005 | ✅ |
| US-031 | MENA compliance profile toggle | 005 | ✅ |

**Out of scope:** Standalone artifact React apps; replacing 003 publish with 004-only path; Sprint 20 without A-GATE-003.

---

## `/speckit.clarify` — Resolved ambiguities

**Program:** [`clarifications.md`](./clarifications.md) (CL-006-001 – CL-006-008)  
**005:** [`clarifications.md`](../../nexus-social-app/specs/005-enterprise-revenue-loop/clarifications.md) (CL-023 – CL-030)  
**004:** [`clarifications.md`](../../nexus-social-app/specs/004-ai-cmo-master-prd-v3/clarifications.md) (CL-001 – CL-007)

### Key decisions (cross-feature)

| ID | Topic | Decision |
|----|-------|----------|
| CL-023 | ABM activation | Reuse `CAMPAIGN_REQUESTED` + `createProcessingCampaignJob` — no parallel workflow |
| CL-026 | CRM transport | Webhook ingest + batch script; full OAuth deferred (#14) |
| CL-029 | Agency | FR-070–072 blocked until A-GATE-003 + `000014` |
| CL-030 | 004 regression boundary | No campaign-workflow step order / reconciler / webhook auth changes |
| CL-006-007 | Go-live definition | 58/58 tasks ≠ production; FR-D01–D05 required |
| DEC-006 | VPS deploy | Hostinger Track 2 **paused**; GitHub + laptop product focus |

### Open questions (non-blocking)

| ID | Question | Owner |
|----|----------|-------|
| OQ-004 | Postman B timeout vs concurrent Ollama | Eng |
| OQ-005 | Persist intelligence CSV imports vs ephemeral | Product |
| OQ-006 | Calendar export: pieces only vs drafts | Product |
| DEC-001 | Langfuse self-host vs Cloud | CIO |
| DEC-003 | HubSpot Private App vs full OAuth | RevOps |

---

## `/speckit.analyze` — Cross-artifact consistency & project status

**Detailed 005 analysis:** [`analysis.md`](../../nexus-social-app/specs/005-enterprise-revenue-loop/analysis.md)

### Whole-platform status

| Dimension | 003 | 004 | 005 | Combined |
|-----------|-----|-----|-----|----------|
| Engineering gates | Pilot-ready | Demo-ready + live 5/5 | Sprint 18–19 shipped | **Staging-ready** |
| Human gates | Meta, OAuth UAT | Dify publish | CRM operator config | **Section B blocked** |
| Tests | In 239 suite | agent-mesh + integration | ABM/CRM/compliance | **239 pass \| 1 skip** |
| Schema | 18/18 | 11/11 + ABM | 13/13 UAT | OK |
| Enterprise narrative | Publish truth | 8-agent mesh | ABM + CRM mirror | CTO-demo credible |

### Launch readiness scores

| Track | Score | Verdict |
|-------|-------|---------|
| 003 pilot UAT | 8.0 | Eng complete; Meta + OAuth human |
| 004 autonomous demo | 7.5 | Live 5/5, Inngest, FinOps |
| 004 production @ 5k ws | 4.5 | Agency blocked, OTel partial |
| 005 ABM enterprise | 9.0 | Sprint 18–19 + ops runbooks |
| **Combined** | **7.8** | **Enterprise pilot / staging OK** |

**Critical path:** Meta App Review → OAuth UAT → Dify publish → prod secrets → staging E2E → (optional) Agency 000014

### Consistency matrix

| Artifact A | Artifact B | Status | Action |
|------------|------------|--------|--------|
| 005 tasks.md Sprint 18–19 | Codebase | ✅ | — |
| GitHub issues #7–#19 | Shipped work | ⚠️ Drift | Run `close-sprint-18-19-issues.sh` (#14 open) |
| 005 analysis §3 FR coverage | tasks.md | ⚠️ Stale | Fixed in this cycle |
| CONSTITUTION §8 migrations | ABM SQL files | ⚠️ Minor | ABM listed; verify 000013 note |
| PRD v2.1.0 | GitHub `main` | ⚠️ Local | Commit when requested |
| Feature 004 analysis test count | Repo (239) | ⚠️ Stale | Doc refresh backlog |

### 005 FR coverage (corrected)

| Bucket | Count | Status |
|--------|-------|--------|
| Pre-005 (US-026–028) | 3 | ✅ |
| Sprint 18 (FR-056–059, 064–065, NFR-013–014) | 8 | ✅ |
| Sprint 19 (FR-060–063, 066–069, NFR-015) | 10 | ✅ |
| Sprint 20 (FR-070–072) | 3 | 🔒 A-GATE-003 |
| **Total 005 FRs** | **21/24 code-complete** | **87.5%** |

---

## `/speckit.plan` — Technical implementation plan

**Program:** [`plan.md`](./plan.md)  
**005:** [`plan.md`](../../nexus-social-app/specs/005-enterprise-revenue-loop/plan.md) · [`implementation-plan.md`](../../nexus-social-app/specs/005-enterprise-revenue-loop/implementation-plan.md)

### Stack (unchanged)

| Layer | Technology |
|-------|------------|
| App | Next.js 16 App Router, Tailwind, Recharts |
| Auth | Supabase session (UI) · `x-api-key` (API/UAT) |
| SoR | Supabase Postgres + RLS |
| SoI | Redis Streams, Qdrant, agent scratch |
| Orchestration | Inngest (8 functions) + Redis campaign job store |
| AI | Dify (primary) → OpenRouter (fallback) + circuit breakers |
| Worker | `src/bin/worker.ts` — publish, analytics, marketing consumers |
| Prod infra | Upstash Redis, Supabase cloud, Inngest Cloud — **no local Redis/Ollama on VPS** |

### Phase plan (current)

| Phase | Scope | Status |
|-------|-------|--------|
| REMEDIATE | SSCADA Loops 1–4 | ✅ |
| DEPLOY-GATE automated | Schema, Postman, live integration | ✅ |
| DEPLOY-GATE human | Meta, OAuth UAT, sign-off, prod secrets | ⬜ |
| 005 Sprint 18–19 | ABM, CRM, MENA, control plane | ✅ |
| Track 1 ops | Runbooks, verify scripts, CI schema-gate | ✅ |
| S15–S17 partial | Channel risk, circuit breakers, perf SLA | ✅ partial |
| 005 Sprint 20 | Agency, FinOps rollup, client portal | 🔒 A-GATE-003 |
| 005-7c | Higgsfield, XLSX, import persistence | Backlog |
| PLATFORM-P2 | TikTok/Snap, SAML, pentest | Deferred |

### Constitution check (all recent work)

| Gate | Result |
|------|--------|
| Reconciler-only writes | PASS |
| CL-030 boundary | PASS |
| 003 isolation | PASS |
| No secrets in repo | PASS (`nexus-social-app.json` gitignored) |

---

## `/speckit.tasks` — Actionable task lists

**Program:** [`tasks.md`](./tasks.md)  
**005:** [`tasks.md`](../../nexus-social-app/specs/005-enterprise-revenue-loop/tasks.md)

### Program — automated (all ✅)

- T-R01–T-R15 SSCADA remediation
- T-D02–D06 schema, Postman, live integration
- T067–T075 Phase 7b UI
- Track 1: ops templates, verify scripts, CI schema-gate
- S15-004-002 channel risk · S16-T004 circuit breakers · S17-T005 perf SLA

### Program — human (open)

- [ ] **T-D07** Live OAuth UAT T053–T056
- [ ] **T-D08** Executive sign-off (`UAT-SIGNOFF-RESULTS.md`)
- [ ] **T-D09** Production secrets + cutover (`OPS-PROD-CUTOVER.md`)
- [ ] **T-D10** Staging re-verify + E2E/k6 (`OPS-STAGING-VERIFICATION.md`)
- [ ] **T-D11** Meta App Review (`OPS-META-APP-REVIEW.md`)
- [ ] **T-D12** Dify publish (`OPS-DIFY-PUBLISH.md`)
- [ ] **T-DOC-001** Close stale GitHub issues #7–#13, #15–#19
- [ ] **T-DOC-002** Commit PRD v2.1.0 when approved
- [ ] **T-DOC-003** Add Supabase secrets to GitHub Actions for `schema-gate`

### 005 Sprint 20 (blocked — do not start)

- [ ] P005-S20-T001 Migration `000014` — **A-GATE-003**
- [ ] P005-S20-T002 Agency switcher UI
- [ ] P005-S20-T003 FinOps rollup dashboard
- [ ] P005-S20-T004 Client portal read-only view

### Backlog (non-blocking)

- [ ] T076–T078 Phase 7c (Higgsfield, XLSX, import persistence)
- [ ] P005-S19-T005 #14 HubSpot full OAuth
- [ ] S15–S17 remainder (Radar live, eval UI, Playwright AI CMO E2E)

---

## `/speckit.taskstoissues` — GitHub issue mapping

**Repo:** `waleedhewalla78-sudo/NEXUS`  
**Backlog:** [`issues-backlog.md`](../../nexus-social-app/specs/005-enterprise-revenue-loop/issues-backlog.md)

| State | Issues | Notes |
|-------|--------|-------|
| Closed (shipped) | #1–#6, #9 | Sprint 18 core |
| **Open but shipped** | #7–#8, #10–#13, #15–#19 | Close via `scripts/close-sprint-18-19-issues.sh` |
| **Open (real work)** | **#14** | HubSpot OAuth stub — keep open |
| Not filed | Sprint 20, S15–S17 remainder, program human gates | Create when unblocked |

**Close script (operator):**

```powershell
cd e:\nexus-social-platform\nexus-social-app
bash scripts/close-sprint-18-19-issues.sh
# or: scripts/close-github-issues-005-shipped.ps1
```

---

## `/speckit.implement` — Execution status

**Sprint 18–19 + Track 1:** **IMPLEMENTED** on `main` (`72f7b91`).

| Deliverable | Evidence |
|-------------|----------|
| ABM activation | `activate-playbook.ts`, `abm_playbook_runs` migration |
| Control plane | API + UI + last-audit |
| CRM webhooks | HubSpot + Salesforce routes, HMAC |
| MENA compliance | `mena-v1.ts`, settings API + UI |
| Channel risk | `GET /api/v1/ai-cmo/channel-risk` + tests |
| Circuit breakers | `circuit-breaker.ts`, production fail-fast |
| Ops | 8 runbooks, `verify:production:*`, CI schema-gate |

**Not implemented (by design / gate):**

- Sprint 20 agency stack (A-GATE-003)
- HubSpot full OAuth (#14)
- Hostinger VPS deploy (DEC-006 paused)
- Human gates B1–B6 (operator)

**CL-030 respected:** No changes to campaign-workflow step order, reconciler validation, or Meta/LinkedIn webhook auth in this pass.

---

## `/speckit.converge` — Assessment vs spec/plan/tasks

**Program convergence:** [`convergence.md`](./convergence.md)  
**005 convergence:** [`convergence.md`](../../nexus-social-app/specs/005-enterprise-revenue-loop/convergence.md)

### Verdict

| Dimension | Assessment |
|-----------|------------|
| Spec vs code (003+004+005) | **Aligned** for shipped scope |
| Plan vs execution | Track 1 + Sprint 18–19 **complete** |
| Tasks vs reality | 005 tasks.md matches repo; program human tasks open |
| Tests vs gates | **239/240** unit; schema 13/13; verify:production:code PASS |
| Production readiness | **Conditional** — Section B only |

### Remaining work appended (new tasks)

See **T-D07–T-D12**, **T-DOC-001–003**, and Sprint 20 block in [`tasks.md`](./tasks.md).

### Risk register (active)

| Risk | Severity | Mitigation |
|------|----------|------------|
| Meta blocks publish | High | B1 gate + `meta_app_review_status` guard |
| CRM webhook forgery | High | HMAC (shipped); operator rotates secrets |
| Doc/issue drift | Low | Close #7–#19; refresh analysis counts |
| Agency scope creep | Med | CL-029 + A-GATE-003 |
| CI schema-gate without secrets | Med | T-DOC-003 |

---

## Command index

| Command | Primary artifact |
|---------|------------------|
| constitution | [`CONSTITUTION.md`](../../nexus-social-app/CONSTITUTION.md) |
| specify | [`spec.md`](./spec.md) · [`NEXUS-MASTER-PRD.md`](../../nexus-social-app/docs/NEXUS-MASTER-PRD.md) |
| clarify | [`clarifications.md`](./clarifications.md) + feature clarifications |
| analyze | This doc § analyze + [`005/analysis.md`](../../nexus-social-app/specs/005-enterprise-revenue-loop/analysis.md) |
| plan | [`plan.md`](./plan.md) + feature plans |
| tasks | [`tasks.md`](./tasks.md) + [`005/tasks.md`](../../nexus-social-app/specs/005-enterprise-revenue-loop/tasks.md) |
| taskstoissues | [`issues-backlog.md`](../../nexus-social-app/specs/005-enterprise-revenue-loop/issues-backlog.md) |
| implement | `main` @ `72f7b91` |
| converge | [`convergence.md`](./convergence.md) |

**Next operator action:** Close Section B gates starting with [`GATES-REMAINING.md`](../../nexus-social-app/docs/GATES-REMAINING.md).
