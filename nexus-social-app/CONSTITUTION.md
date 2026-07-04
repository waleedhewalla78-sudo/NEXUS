# Nexus Social Platform — Constitution

> **Governing principles and development guidelines for `nexus-social-app`.**  
> Canonical Speckit copy: [`.specify/memory/constitution.md`](.specify/memory/constitution.md)  
> **Version 1.4.0** · Ratified 2026-06-23 · Last amended 2026-07-04

---

## Table of contents

1. [Purpose & scope](#1-purpose--scope)
2. [Architectural principles](#2-architectural-principles)
3. [Security & compliance](#3-security--compliance)
4. [AI governance](#4-ai-governance)
5. [Development workflow](#5-development-workflow)
6. [Code standards](#6-code-standards)
7. [Testing requirements](#7-testing-requirements)
8. [Database & migrations](#8-database--migrations)
9. [Operational principles](#9-operational-principles)
10. [Productization](#10-productization)
11. [What we do NOT do](#11-what-we-do-not-do)
12. [Decision log](#12-decision-log)
13. [Links & references](#13-links--references)

---

## 1. Purpose & scope

Nexus Social is an enterprise-grade, AI-native omnichannel social media management platform. This document is the **single entry point** for how we build, test, and ship the application in this repository.

Two feature tracks share one codebase:

| Feature | Focus | Status |
|---------|-------|--------|
| **[003 — Real Integrations Production](specs/003-real-integrations-production/)** | OAuth, publish, analytics, worker, webhooks, billing | **Production baseline** (Sprints 1–11) |
| **[004 — AI CMO Master PRD v3](specs/004-ai-cmo-master-prd-v3/spec.md)** | AI agents, hierarchy, orchestration, policy, FinOps, memory | **Additive** (Sprint 12+) |
| **005 — Enterprise revenue / GTM** | ABM, CRM loop, enterprise skin, leads, LinkedIn/Meta ingest | **Sprints 18–19 + Sprint 2–3 shipped** |

Feature 004 builds on 003. Nothing in 004 may break OAuth, publish, or worker behavior without regression proof.

**GTM / Diligent AI skin:** Production may run with `NEXT_PUBLIC_ENABLE_SaaS_UI=false` and `NEXT_PUBLIC_ENABLE_ENTERPRISE_LANDING=true`. Pilot onboarding is **high-touch** (operator script + manual `workspace_members`) — **no self-serve signup UI** unless Product explicitly unblocks it.

**Agency scale (Sprint 6):** Internal Pit Crew Console (`/admin`) is **payment-gated** — implement only after Client #1 has paid (CL-036).

Sibling monorepo projects (`dify/`, `activepieces/`, `chatwoot/`) integrate with Nexus Social but do not own its core data or orchestration.

---

## 2. Architectural principles

### SoR / SoI — reconciler-only writes

**System of Record (SoR)** = Supabase transactional tables.  
**System of Intelligence (SoI)** = vectors, Redis, agent scratch, Dify context.

Agents and Dify workflows **never** write SoR directly. All mutations go through [`src/lib/sync/reconciler.ts`](src/lib/sync/reconciler.ts) and domain services (e.g. [`campaign-service.ts`](src/lib/ai-cmo/campaign-service.ts)) with validation, RLS, and audit logging.

### Dify as runtime, not orchestrator

- **Dify** → RAG, chat, generation per workspace  
- **Orchestration** → [`src/lib/orchestration/`](src/lib/orchestration/) (Inngest — 8 functions; Redis bridge for dev)  
- **Event bus** → [`marketing-event-bus.ts`](src/lib/events/marketing-event-bus.ts) (Redis Streams)

Call Dify first, OpenRouter fallback second. Dify is not the workflow state machine.

### Event-driven design

Marketing triggers publish to Redis Streams. The worker ([`src/bin/worker.ts`](src/bin/worker.ts)) registers consumers for publish, analytics, reputation, and AI CMO replanning. Long-running work returns **202 + poll**, not blocked HTTP.

### Multi-tenant RLS

Every read/write is scoped by `workspaceId` / `tenantId`. New tables ship with RLS via `workspace_members` / `is_workspace_member` **before** any API route. Cross-tenant leakage blocks release.

### Zero regression between features

003 test suite stays green on every commit. Touching OAuth handlers, publish adapters, webhooks, or worker publish loops requires explicit regression tests.

---

## 3. Security & compliance

| Area | Rule |
|------|------|
| **Row-level security** | Mandatory on all tenant-scoped tables |
| **Token encryption** | OAuth tokens encrypted with `TOKEN_ENCRYPTION_KEY` when publishing is enabled |
| **SSRF** | Server/worker outbound HTTP uses approved safe patterns — no raw fetch to user URLs |
| **Secrets** | Never in repo, specs, or logs |
| **GDPR / UAE PDPL / Egypt DPL** | Policy engine flags data claims, geo offers, profiling copy; region from `tenants.data_region` |
| **Meta App Review** | Meta publish blocked until `meta_app_review_status = approved` |
| **Audit trail** | Reconciler writes, policy evaluations, approvals → `audit_logs` + domain tables |
| **Production** | `DEMO_ANALYTICS_ENABLED=false`, `NODE_ENV=production` |

---

## 4. AI governance

> **Risk tier and policy violations determine approval — never LLM confidence alone.**

| Tier | Auto-publish | Oversight |
|------|--------------|-----------|
| LOW | Yes, if quality threshold met | Optional spot-check |
| MED | No | Operator approval |
| HIGH | No | Compliance + operator |
| CRITICAL | **Never** | Legal; hard blocks on sensitive content |

**Implementation today**

- Policy engine: [`src/lib/governance/policy-engine.ts`](src/lib/governance/policy-engine.ts)
- Quality gate: campaign workflow
- Calibrated confidence: explainability only — cannot override CRITICAL/HIGH blocks

**MENA:** Locale-aware output (`en-US`, `ar-SA`). Expanded compliance rules in Sprint 16.

Deep reference: [architecture-audit/06-policy-governance.md](specs/004-ai-cmo-master-prd-v3/architecture-audit/06-policy-governance.md)

---

## 5. Development workflow

### Speckit cycle

Each feature under `specs/{NNN-name}/` maintains:

`spec.md` · `plan.md` · **`tasks.md`** (source of truth) · `analysis.md` · `clarifications.md` · `convergence.md` · `checklists/`

This constitution wins over conflicting PRD prose. Recorded clarifications win over PRD defaults.

### Before marking a task `[x]`

```powershell
npm run typecheck && npm test && npm run schema:verify && npm run build
```

004 schema work also requires:

```powershell
npm run schema:verify:004
```

### New dependencies

Packages like Inngest require **explicit approval**. Scaffold interfaces and document the install path until approved.

### Launch

Follow [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md). Staging gate: `npm run verify:staging`.

---

## 6. Code standards

- **TypeScript strict** — no `any` on public surfaces  
- **Minimal diffs** — smallest correct change  
- **No secrets in repo** — document keys in `.env.example` only  
- **i18n** — user strings in locale files  
- **Next.js** — read `node_modules/next/dist/docs/`; this version has breaking API differences  
- **Overlay UI** — follow portal/z-index contracts when using shared overlay primitives  
- **Fail-fast env** — `verifyEnv()` intentionally crashes on missing critical keys  
- **Comments** — explain non-obvious *why*, not restate code  

---

## 7. Testing requirements

| Type | When |
|------|------|
| **Unit tests** | Required for new libraries under `src/lib/` |
| **003 regression** | OAuth, publish, webhooks stay covered when touched |
| **Schema verify** | `schema:verify` (18/18) + `schema:verify:004` (11/11) |
| **Smoke E2E** | Playwright publish path (T024) for launch confidence |
| **Operator UAT** | LAUNCH_CHECKLIST Phases 1–2 (OAuth → publish → analytics truth) |
| **Pre-launch** | `verify:staging` + `ai:verify` after Dify apps published |

Do not mark tasks complete on scaffold alone.

---

## 8. Database & migrations

Apply files in order under `supabase/migrations/`:

| Track | Migrations | Verify command |
|-------|------------|----------------|
| 003 baseline | `000001`–`000010` | `npm run schema:verify` |
| 004 AI CMO | `000011` hierarchy → `000012` foundation | `npm run schema:verify:004` |
| 005 ABM | `20260630_enterprise_abm_tables.sql` | `npm run verify:abm-seed` |
| 005 playbook runs | `20260701_abm_playbook_runs.sql` | `npm run uat:check-schema` |
| Sprint 2 LMM | `20260705_enterprise_leads.sql` | `uat:check-schema` includes `enterprise_leads` |

**SQL Editor bundles**

- Full 004: `RUN_IN_SQL_EDITOR_004_sprint12.sql`
- 000012 only (if 000011 applied): `RUN_IN_SQL_EDITOR_004_000012_only.sql`
- ABM UAT bundle: `RUN_IN_SQL_EDITOR_UAT_ABM.sql`

**After manual apply**

```sql
NOTIFY pgrst, 'reload schema';
```

Draft migrations `000013` / `000014` need leadership gates before production apply.

---

## 9. Operational principles

- **Redis + worker required** — AI replies, publish, analytics sync, marketing events  
- **Health** — `GET /api/health` reports worker `up` via Redis heartbeat  
- **FinOps** — cost ledger writes, budget policies, MV refresh (Phase D)  
- **Observability** — OTel + Langfuse pending A-GATE-002  
- **Incidents** — [docs/AI_INCIDENT_RUNBOOK.md](docs/AI_INCIDENT_RUNBOOK.md)  
- **Deploy** — app + worker together; see [DEPLOYMENT.md](DEPLOYMENT.md)  

Scale target (004): 5k workspaces, 500 agencies, 99.9% uptime — see [production readiness assessment](specs/004-ai-cmo-master-prd-v3/architecture-audit/16-production-readiness-assessment.md).

### Disaster recovery targets

From [13-disaster-recovery.md](specs/004-ai-cmo-master-prd-v3/architecture-audit/13-disaster-recovery.md):

| Tier | RPO | RTO | Scope |
|------|-----|-----|-------|
| **Critical** | 15 min | 1 hour | Supabase Postgres (SoR), Redis queues, auth |
| **Important** | 1 hour | 4 hours | Inngest state, Qdrant vectors |
| **Degraded OK** | 24 hours | 24 hours | Langfuse traces, MV refresh lag |

Circuit breakers (Dify → OpenRouter fallback, Redis degraded mode) are required before 5k-workspace scale (Sprint 16 / Phase F gate).

### FinOps & observability targets

- **FinOps:** Every token/API call logged to `ai_cmo_cost_ledger`; budget caps enforced pre-flight; alert at 50%, 80%, 95%, 100% thresholds ([09-finops-framework.md](specs/004-ai-cmo-master-prd-v3/architecture-audit/09-finops-framework.md))
- **Observability:** OTel distributed traces + Langfuse for LLM eval correlation (pending A-GATE-002); Sentry for errors; reconciler error rate >1%/5min pages oncall ([10-observability.md](specs/004-ai-cmo-master-prd-v3/architecture-audit/10-observability.md))

---

## 10. Productization

**Current hierarchy**

```text
Tenant → Workspace → Brand → Campaign → Content / Posts
```

**Target (agency migration pending)**

```text
Tenant → Agency → Client Brand → Workspace → Campaign → Content / Posts
```

Agency table (`000014`) and white-label billing await **A-GATE-003**. See [12-multi-tenant-productization.md](specs/004-ai-cmo-master-prd-v3/architecture-audit/12-multi-tenant-productization.md).

---

## 11. What we do NOT do

- Write SoR from agents or Dify workflows  
- Use Dify as the orchestrator  
- Enable demo analytics in production  
- Ship tables without RLS  
- Route approval by confidence score alone  
- Evaluate policy via regex on raw JSON blobs  
- Add unapproved orchestration/observability dependencies  
- Change 003 publish/OAuth without regression tests  
- Commit secrets or skip schema verification  
- Build self-serve multi-tenant onboarding UI for pilots (Sprint 4 is sales + a provision script only)  
- Modify `campaign-workflow.ts` step order or `reconciler.ts` validation (CL-030)  

---

## 12. Decision log

### Clarifications (CL-001 – CL-007)

Resolved in [clarifications.md](specs/004-ai-cmo-master-prd-v3/clarifications.md). These supersede PRD defaults where noted.

| ID | Topic | Decision |
|----|-------|----------|
| **CL-001** | Event bus | **Redis Streams** via existing `ioredis` (`REDIS_URL`); `marketing-event-bus.ts` with `XADD`, consumer groups, idempotency keys. Kafka swap deferred behind interface. |
| **CL-002** | Orchestration | **Scaffold without new npm dep** — interface + `campaign-workflow.ts` skeleton in `src/lib/orchestration/`. Inngest install pending leadership approval (A-GATE-001). |
| **CL-003** | Campaigns vs posts | **Map, don't duplicate** — `ai_cmo_campaigns` for orchestration metadata; `posts` for publish execution; link via `post_id` FK; drafts in `ai_cmo_content_pieces`. |
| **CL-004** | Hierarchy migration | **Non-destructive backfill** in 000011 + 000012: default tenant per workspace, set `workspaces.tenant_id`, brands per workspace. RLS on `workspace_members` stays primary boundary. |
| **CL-005** | Dify client | **Agent runtime only** — `sendDifyChatMessage` in `src/lib/dify/client.ts`; orchestration in `src/lib/orchestration/`. Workspace keys from `ai_agent_configs.dify_app_api_key` override env. |
| **CL-006** | 003 regression boundary | Sprint 12–13 **additive only** — reconciler write path opt-in via `campaign-service.ts`; publish worker unchanged. |
| **CL-007** | Migration split | Apply **000011** (hierarchy) then **000012** (foundation); combined bundle `RUN_IN_SQL_EDITOR_004_sprint12.sql` for fresh envs. Verified 11/11 via `schema:verify:004`. |

### Leadership gates

| Topic | Status | Notes |
|-------|--------|-------|
| **Inngest** | **Shipped (2026-06-27)** | A-GATE-001 — 8 functions; Cloud config = DevOps |
| **Langfuse** | Pending | A-GATE-002 — self-host vs Cloud |
| **Agency table** | Pending | A-GATE-003 — migration 000014 recommended |
| **Dify publish** | Operator action | A-GATE-004 / S13-T012 — `npm run ai:verify` |
| **PDPL review** | Pending | A-GATE-005 — memory/FinOps data flows |
| **Dify role** | **Decided** | Runtime only (CL-005) |
| **Meta App Review** | Gate live | T057 — flag must be `approved` |

Updates belong in [convergence.md](specs/004-ai-cmo-master-prd-v3/convergence.md) and [IMPLEMENT_PLAN_ALL_OPEN.md](specs/004-ai-cmo-master-prd-v3/IMPLEMENT_PLAN_ALL_OPEN.md).

---

## 13. Links & references

| Resource | Location |
|----------|----------|
| Master open-work plan | [IMPLEMENT_PLAN_ALL_OPEN.md](specs/004-ai-cmo-master-prd-v3/IMPLEMENT_PLAN_ALL_OPEN.md) |
| Architecture audit (16 docs) | [architecture-audit/README.md](specs/004-ai-cmo-master-prd-v3/architecture-audit/README.md) |
| Policy & governance | [06-policy-governance.md](specs/004-ai-cmo-master-prd-v3/architecture-audit/06-policy-governance.md) |
| Launch checklist | [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md) |
| Feature 003 | [specs/003-real-integrations-production/](specs/003-real-integrations-production/) |
| Feature 004 spec | [spec.md](specs/004-ai-cmo-master-prd-v3/spec.md) |
| Notion Feature 004 hub | https://www.notion.so/3886f21f521a8111aaacf9f2414b668e |
| Speckit canonical copy | [.specify/memory/constitution.md](.specify/memory/constitution.md) |

---

## Amendments

1. Bump version (semver) in both this file and `.specify/memory/constitution.md`.  
2. Update the Sync Impact Report comment in the canonical copy.  
3. Propagate changes to affected spec artifacts and Notion hub.  
4. PRs touching AI CMO or publish paths must cite compliance with this constitution.

**Version 1.4.0** · Ratified 2026-06-23 · Last amended 2026-07-04 (enterprise skin, LMM leads, GTM high-touch pilots)
