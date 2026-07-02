<!--
Sync Impact Report
Version change: 1.1.0 → 1.2.0
Added: CL-001–CL-007 clarifications table, DR RPO/RTO targets, FinOps/observability targets
Follow-up: Notion "Project Constitution" page — manual sync (MCP unavailable)
-->

# Nexus Social Platform Constitution

**Canonical path:** `nexus-social-app/.specify/memory/constitution.md`  
**Human entry point:** [`CONSTITUTION.md`](../../CONSTITUTION.md) at app root  
**Version:** 1.2.0 · **Ratified:** 2026-06-23 · **Last Amended:** 2026-06-24

---

## 1. Purpose & Scope

Nexus Social is an enterprise-grade, AI-native omnichannel social media management platform. This constitution governs all development in **`nexus-social-app/`** — the primary application surface for the Nexus Social monorepo.

| Feature | Path | Scope |
|---------|------|-------|
| **003 — Real Integrations Production** | `specs/003-real-integrations-production/` | OAuth (Meta, LinkedIn, X), publish adapters, webhooks, worker queues, real analytics, launch hardening — **production baseline** |
| **004 — AI CMO Master PRD v3** | `specs/004-ai-cmo-master-prd-v3/` | Tenant/brand hierarchy, AI agents, orchestration, policy/quality gates, FinOps, memory loop — **additive on 003** |

Feature-specific non-negotiables live in `specs/004-ai-cmo-master-prd-v3/constitution.md` and defer to this file on conflict.

Monorepo siblings (`dify/`, `activepieces/`, `chatwoot/`) have their own `AGENTS.md` rules; they are integration targets, not orchestrators for Nexus Social core flows.

---

## 2. Architectural Principles

### I. SoR / SoI Separation (NON-NEGOTIABLE)

- **System of Record (SoR):** Supabase transactional tables (`workspaces`, `posts`, `social_connections`, `ai_cmo_*`, etc.).
- **System of Intelligence (SoI):** Vector stores, Redis caches, agent scratch state, Dify conversation context.

AI agents, Dify workflows, and external automations **MUST NOT** mutate SoR tables directly. All writes pass through **`src/lib/sync/reconciler.ts`** and domain services (e.g. `campaign-service.ts`) with validation, RLS enforcement, and audit logging.

### II. Dify as Runtime, Not Orchestrator

Dify is **agent runtime only** — RAG, chat, tool execution per workspace. Workflow state and durable async campaigns live in **`src/lib/orchestration/`** (Inngest when approved; Redis worker stub until then). Agents call Dify first, OpenRouter fallback second. Never use Dify as the workflow state machine.

### III. Event-Driven Architecture

Marketing triggers flow through **`marketing-event-bus.ts`** (Redis Streams). Worker registers consumers in **`src/bin/worker.ts`**. Replanning and side effects are event-driven, not synchronous HTTP chains.

### IV. Multi-Tenant RLS

Every query and write MUST be scoped by `workspaceId` / `tenantId`. New tables require RLS policies joined through `workspace_members` / `is_workspace_member`. Cross-tenant data leakage is a **release blocker**. Feature 004 hierarchy tables (`tenants`, `brands`, `ai_cmo_*`) are additive; existing 003 RLS on `workspaces` remains authoritative.

### V. Zero Regression Between Features

Feature 003 is the production baseline. Feature 004 is additive. Sprint 12+ work **MUST NOT** modify OAuth handlers, publish adapters, webhook handlers, or existing worker publish loops without explicit regression tests. The 003 test suite MUST remain green on every commit.

---

## 3. Security & Compliance

| Control | Requirement |
|---------|-------------|
| **RLS** | All tenant-scoped tables; member policies before any API surface |
| **Token encryption** | OAuth tokens via `TOKEN_ENCRYPTION_KEY` when `PUBLISHING_ENABLED=true` |
| **SSRF** | Outbound HTTP from server/worker through approved safe-HTTP patterns; no raw fetch to user-supplied URLs |
| **Secrets** | No secrets in specs, commits, or logs; platform secrets via env / vault |
| **GDPR / UAE PDPL / Egypt Law 151** | Policy engine flags data-claim, geo-restricted offers, profiling copy; `tenants.data_region` drives jurisdiction rules (Sprint 16+) |
| **Meta App Review** | Production Meta publish gated on `meta_app_review_status = approved` |
| **Audit logs** | Policy evaluations, reconciler mutations, approval decisions → `audit_logs` and domain tables |
| **Production flags** | `DEMO_ANALYTICS_ENABLED=false`; `NODE_ENV=production` in prod |

---

## 4. AI Governance

**Approval routing is determined by risk tier and policy violations — never by LLM confidence alone.**

| Tier | Auto-publish | Human approval |
|------|--------------|----------------|
| **LOW** | Allowed if quality ≥ threshold | Optional spot-check |
| **MED** | Never | Single operator approval |
| **HIGH** | Never | Compliance reviewer + operator |
| **CRITICAL** | **Never** | Legal counsel; blocks on `action=block` |

Implementation: **`src/lib/governance/policy-engine.ts`**, quality gate in campaign workflow, calibrated confidence (`calibrated-confidence.ts`) for explainability only — it **must not** override CRITICAL or HIGH policy blocks.

Locale-aware output (`en-US`, `ar-SA`) required for MENA tenants. Compliance Agent expands rules in Sprint 16.

See `specs/004-ai-cmo-master-prd-v3/architecture-audit/06-policy-governance.md` for full policy catalog and workflow.

---

## 5. Development Workflow

### Speckit artifact chain

Features live under `nexus-social-app/specs/{NNN-name}/`. Required artifacts:

`constitution.md` (or reference to this file), `spec.md`, `plan.md`, **`tasks.md`** (source of truth for sprint work), `analysis.md`, `clarifications.md`, `convergence.md`, `checklists/`.

**Constitution supersedes** ad-hoc PRD prose or task notes; clarifications supersede PRD defaults where noted.

### Task completion gates

No task in `tasks.md` may be marked `[x]` until acceptance criteria pass locally:

```powershell
npm run typecheck && npm test && npm run schema:verify && npm run build
```

Feature 004 schema-dependent tasks additionally require:

```powershell
npm run schema:verify:004
```

### Dependency approval

New npm dependencies (e.g., Inngest, Langfuse SDK) require explicit leadership approval. Scaffold interfaces and document install path in README stubs until approved.

### Launch readiness

Use **`LAUNCH_CHECKLIST.md`** + feature checklists under `specs/*/checklists/`. Staging verification: `npm run verify:staging`.

---

## 6. Code Standards

| Rule | Detail |
|------|--------|
| **TypeScript** | Strict mode; no `any`; explicit types on public APIs |
| **Minimal diffs** | Smallest correct change; no drive-by refactors |
| **No secrets in repo** | `.env.example` documents keys only |
| **i18n** | User-facing strings via locale files, not hardcoded English |
| **Next.js** | Read `node_modules/next/dist/docs/` — this repo uses a non-standard Next.js version; heed deprecation notices |
| **Overlay UI** | When touching shared UI patterns, follow overlay primitive contracts (portals, z-index layering) consistent with monorepo dify-ui guidance |
| **Boot-time env** | `verifyEnv()` crash on missing critical keys — intentional fail-fast |
| **Comments** | Explain *why*, not *what*; code is self-documenting |

---

## 7. Testing Requirements

| Layer | Requirement |
|-------|-------------|
| **Unit tests** | Mandatory for new libs under `src/lib/`; co-located or mirrored in test tree |
| **Regression** | 003 OAuth/publish/webhook paths stay green; add tests when touching baseline |
| **Schema verify** | `schema:verify` (18/18 for 003) and `schema:verify:004` (11/11 for 004) in CI path |
| **Smoke E2E** | Playwright publish flow (T024) before full launch; operator UAT scripts in LAUNCH_CHECKLIST |
| **Pre-launch** | `npm run verify:staging` — typecheck + test + schema:verify + ai:verify |
| **AI verify** | `npm run ai:verify` (exit 0) after Dify Brain + Creator publish |

Mark sprint tasks complete only after relevant gates pass — not on scaffold alone.

---

## 8. Database & Migrations

### Ordering

Apply migrations in **filename order** under `supabase/migrations/`.

| Track | Range | Verify |
|-------|-------|--------|
| Feature 003 | `000001` → `000010` | `npm run schema:verify` (18/18) |
| Feature 004 | `000011` (hierarchy) → `000012` (foundation) | `npm run schema:verify:004` (11/11) |

### SQL Editor bundles

- Combined: `RUN_IN_SQL_EDITOR_004_sprint12.sql` (000011 + 000012)
- Partial (000011 already applied): `RUN_IN_SQL_EDITOR_004_000012_only.sql`

### Post-apply

Always run:

```sql
NOTIFY pgrst, 'reload schema';
```

Or `PATCH_MIGRATION_STATUS_NOTIFY.sql` for idempotent reload.

Draft migrations (`000013`, `000014`) require leadership gate before apply.

---

## 9. Operational Principles

| Principle | Detail |
|-----------|--------|
| **Worker + Redis** | Required for AI replies, publish loop, analytics sync, marketing events; `npm run worker:dev` locally |
| **Health checks** | `GET /api/health` → `details.worker = up` when Redis heartbeat present |
| **FinOps intent** | Token/cost writes to `ai_cmo_cost_ledger`; `budget_policies` pre-flight caps; MV refresh cron (Phase D) |
| **Observability** | OTel + Langfuse (pending A-GATE-002); structured audit for AI decisions |
| **Incident response** | `docs/AI_INCIDENT_RUNBOOK.md` — kill switch, rate limiters |
| **Deployment** | See `DEPLOYMENT.md`; worker runs alongside app in production |

Target scale (004): 5,000+ workspaces, 500+ agencies, 99.9% uptime — see architecture audit Phase 16 readiness assessment.

### Disaster recovery targets

From `architecture-audit/13-disaster-recovery.md`:

| Tier | RPO | RTO | Scope |
|------|-----|-----|-------|
| **Critical** | 15 min | 1 hour | Supabase Postgres (SoR), Redis queues, auth |
| **Important** | 1 hour | 4 hours | Inngest state, Qdrant vectors |
| **Degraded OK** | 24 hours | 24 hours | Langfuse traces, MV refresh lag |

Circuit breakers (Dify → OpenRouter fallback, Redis degraded mode) required before 5k-workspace scale (Sprint 16 / Phase F gate).

### FinOps & observability targets

- **FinOps:** Token/API calls → `ai_cmo_cost_ledger`; budget caps pre-flight; alerts at 50%, 80%, 95%, 100% (see `09-finops-framework.md`)
- **Observability:** OTel + Langfuse (pending A-GATE-002); Sentry errors; reconciler error rate >1%/5min pages oncall (see `10-observability.md`)

---

## 10. Productization

### Hierarchy (current → target)

```text
Tenant (billing entity, data region, plan)
  └── Agency (optional — pending migration 000014)
        └── Client Brand (brands table)
              └── Workspace (operational unit)
                    └── Campaign (ai_cmo_campaigns)
                          └── Content pieces / Posts
```

PRD v3 stated Tenant → Workspace → Brand → Campaign. Audit correction inserts **Agency** for reseller scale. Agency table and `brands.agency_id` FK are **pending** A-GATE-003.

White-label per agency, tenant-level billing aggregation, and agency admin roles follow Phase H.

See `architecture-audit/12-multi-tenant-productization.md`.

---

## 11. What We Do NOT Do

| Anti-pattern | Why |
|--------------|-----|
| Agents write SoR directly | Bypasses RLS, audit, reconciler validation |
| Dify as orchestrator | No durable workflow state, retry, or DLQ |
| Demo analytics in production | `DEMO_ANALYTICS_ENABLED` must be `false` |
| Skip RLS on new tables | Cross-tenant leakage is a release blocker |
| Confidence-only approval | Policy tier always wins over LLM score |
| Regex policy on raw JSON | Use structured `ContentPiece` contract |
| Unapproved npm deps | Inngest/Langfuse blocked until leadership gates |
| Modify 003 publish/OAuth without regression tests | Zero-regression principle |
| Secrets in specs or commits | Security & compliance violation |
| Silent schema drift | PGRST205 / failed schema:verify blocks release |

---

## 12. Decision Log

### Clarifications (CL-001 – CL-007)

Resolved in `specs/004-ai-cmo-master-prd-v3/clarifications.md`. Supersede PRD defaults where noted.

| ID | Topic | Decision |
|----|-------|----------|
| **CL-001** | Event bus | **Redis Streams** via `ioredis` (`REDIS_URL`); `marketing-event-bus.ts` with consumer groups and idempotency keys |
| **CL-002** | Orchestration | **Scaffold without new npm dep** — `src/lib/orchestration/` skeleton; Inngest pending A-GATE-001 |
| **CL-003** | Campaigns vs posts | **Map, don't duplicate** — `ai_cmo_campaigns` metadata; `posts` publish; link via `post_id` |
| **CL-004** | Hierarchy migration | **Non-destructive backfill** in 000011 + 000012; `workspace_members` RLS stays primary |
| **CL-005** | Dify client | **Agent runtime only** — `sendDifyChatMessage`; workspace keys override env |
| **CL-006** | 003 regression boundary | Sprint 12–13 **additive only** — publish worker unchanged |
| **CL-007** | Migration split | **000011** then **000012**; combined `RUN_IN_SQL_EDITOR_004_sprint12.sql` for fresh envs |

### Leadership gates

| Decision | Status | Options / Notes | Gate ID |
|----------|--------|-----------------|---------|
| **Inngest orchestration** | Pending approval | Inngest (recommended) vs Temporal vs Redis-only stub | A-GATE-001 |
| **Langfuse observability** | Pending | Self-host vs Cloud vs OTel-only | A-GATE-002 |
| **Agency hierarchy table** | Pending | New `agencies` table + migration 000014 (recommended) vs extend `tenants` | A-GATE-003 |
| **Dify Brain + Creator publish** | Open (operator) | Runtime-only role confirmed; apps must be published | A-GATE-004 / S13-T012 |
| **PDPL data flow review** | Pending | Security sign-off for memory/FinOps paths | A-GATE-005 |
| **Dify role** | **Decided** | Runtime-only (CL-005) | Constitution II |
| **Meta App Review** | Gate in place | Publish blocked until `meta_app_review_status = approved` | T057 |

Update when leadership decisions land in `implementation-plan.md` / `convergence.md`.

---

## 13. Links & References

| Resource | Path / URL |
|----------|------------|
| **Human constitution** | [`CONSTITUTION.md`](../../CONSTITUTION.md) |
| **Master open work plan** | [`specs/004-ai-cmo-master-prd-v3/IMPLEMENT_PLAN_ALL_OPEN.md`](../specs/004-ai-cmo-master-prd-v3/IMPLEMENT_PLAN_ALL_OPEN.md) |
| **Architecture audit index** | [`specs/004-ai-cmo-master-prd-v3/architecture-audit/README.md`](../specs/004-ai-cmo-master-prd-v3/architecture-audit/README.md) |
| **Policy & governance deep-dive** | [`architecture-audit/06-policy-governance.md`](../specs/004-ai-cmo-master-prd-v3/architecture-audit/06-policy-governance.md) |
| **Launch checklist** | [`LAUNCH_CHECKLIST.md`](../../LAUNCH_CHECKLIST.md) |
| **Feature 003 baseline** | [`specs/003-real-integrations-production/`](../specs/003-real-integrations-production/) |
| **Feature 004 spec** | [`specs/004-ai-cmo-master-prd-v3/spec.md`](../specs/004-ai-cmo-master-prd-v3/spec.md) |
| **Convergence log** | [`specs/004-ai-cmo-master-prd-v3/convergence.md`](../specs/004-ai-cmo-master-prd-v3/convergence.md) |
| **Notion — Feature 004 hub** | https://www.notion.so/3886f21f521a8111aaacf9f2414b668e |
| **Root constitution (legacy pointer)** | `D:/nexus-social-platform/.specify/memory/constitution.md` — superseded by this file for app work |

---

## Governance

- This constitution supersedes conflicting PRD prose, task notes, or ad-hoc decisions.
- Amendments require version bump (semver), updated Sync Impact Report comment, and propagation to affected spec artifacts.
- All PRs touching AI CMO or publish paths MUST cite regression guardrail compliance.
- Feature 004 constitution (`specs/004-ai-cmo-master-prd-v3/constitution.md`) defers here on conflict.

**Version**: 1.2.0 | **Ratified**: 2026-06-23 | **Last Amended**: 2026-06-24
