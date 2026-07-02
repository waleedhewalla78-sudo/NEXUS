# Implementation Plan: Nexus Social Platform

**Branch**: `002-nexus-social-platform` | **Date**: 2026-06-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from [specs/002-nexus-social-platform/spec.md](./spec.md)

## Summary

Nexus Social is an enterprise-grade, AI-native omnichannel social management and customer service platform built as a **composable monorepo**: a Next.js orchestration layer (`nexus-social-app`) integrating Supabase (auth/data), Chatwoot (inbox), Dify (RAG/LLM), Activepieces (automation), Stripe (billing), and Redis (queues/rate limits).

**Current state (assessment):** Sprints 1–11 and AI Weeks 1–5 are **~65–80% scaffolded** in `nexus-social-app/`—most files exist but critical paths are unwired, stubbed, or insecure. Feature `001-production-readiness-hardening` (Phase 1 complete; Phases 2–8 pending) is the **mandatory gate** before GA.

**Technical approach:** Execute in four waves—(0) harden foundation, (1) secure MVP (auth + content + inbox + AI pipeline), (2) monetization + observability, (3) developer API + enterprise—while consolidating SQL migrations, env contracts, and deployment topology (app + worker + Redis + OTEL).

---

## Technical Context

**Language/Version**: Node.js 22+, TypeScript 5, Next.js 16 (App Router)

**Primary Dependencies**: `@supabase/supabase-js`, `@supabase/auth-helpers-nextjs`, `ioredis`, `@opentelemetry/sdk-node`, `@sentry/nextjs`, `stripe`, `zod`, `next-intl`, `reactflow`, `recharts`

**Storage**: Supabase PostgreSQL (RLS multi-tenancy), Supabase Storage (media, enterprise migrations), Redis (AI queue, rate limits, token counters)

**Testing**: Vitest (unit), Playwright (E2E AI critical paths), Cypress (security/billing/integration), k6 (load)

**Target Platform**: Docker Compose (dev/staging), Vercel Edge + standalone worker containers (production)

**Project Type**: Multi-service web application (orchestrator + background workers + vendored integrations in sibling repos: `chatwoot/`, `dify/`, `activepieces/`)

**Performance Goals** (from spec SC-010 / blueprint):
- Content creation p95 < 500ms @ 50 VUs
- Calendar load p95 < 300ms @ 200 VUs
- AI webhook ingestion 100 msg/s, queue depth < 500
- AI auto-reply p95 < 5s from webhook receipt

**Constraints**:
- Zero cross-tenant data leakage (RLS on all workspace-scoped tables)
- PII redaction before any outbound AI call
- Fail-closed on Redis/AI outages (route to humans)
- Atomic AI credit deductions under concurrency
- Workers must run as separate processes from Next.js serverless/edge

**Scale/Scope**: Agency multi-tenant SaaS; 9 user stories; ~23 server action modules; 4 background job types; 2 worker daemons; 11 sprint domains + 5 AI weeks

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|-----------|------|--------|
| **I. Multi-Tenancy First** | Every query scoped by `workspace_id` via RLS + server-side membership checks | **PARTIAL** — RLS schemas exist; `inbox.ts`, `aiReply.ts` have auth bypasses |
| **II. Security by Default** | Webhooks signed, API keys hashed, HITL for destructive tools, env verified at boot | **FAIL** — Chatwoot webhooks unsigned; `api-auth.ts` unwired; `verifyEnv()` soft-fails |
| **III. Fail-Closed Operations** | Queue/AI failures escalate to humans; health returns 503 when degraded | **PARTIAL** — Logic exists in routes; health masks some failures |
| **IV. Observability** | OTEL spans on AI jobs; Sentry on errors; audit logs for sensitive actions | **PARTIAL** — `instrumentation.ts` exists; OTEL startup pending (001-T010) |
| **V. Test-Gated Launch** | 100% critical QA pass (SEC-01, AI-01, AI-02, BILL-01, etc.) | **FAIL** — E2E partially manual; `/api/v1/*` routes missing |

**Gate decision:** Proceed with plan; **Wave 0 (001 hardening) blocks production release** until constitution gates pass.

---

## Gap & Risk Assessment

### Implementation maturity by sprint

| Area | Completion | Critical gaps |
|------|------------|---------------|
| S1 Auth & shell | ~75% | No route-level login gate; workspace store unset |
| S2 Content + AI captions | ~80% | Credit deduction race (001-T009) |
| S3 Unified inbox | ~75% | Duplicate stub in `inbox.ts`; hardcoded `userId: 'system'` |
| S4 Analytics + white-label | ~70% | Demo data fallbacks; custom domain route missing |
| S5 Omnichannel + mobile | ~40% | No Expo app in repo; WhatsApp webhook sig unverified |
| S6 ML / predictions | ~35% | No FastAPI microservice; reads empty `predictions` |
| S7 Enterprise | ~60% | SSO comments only; audit helper exists |
| S8 Billing | ~70% | Stripe mock fallback key; atomic credits pending |
| S9 Public API | ~25% | **No `/api/v1/*` routes**; `api-auth.ts` broken/unwired |
| S10 Automations + i18n | ~65% | Migration worker loop inactive |
| S11 Launch | ~70% | k6 scripts exist; worker not in default dev flow |
| AI Weeks 1–5 | ~80% | No Dify client module; tool mocks; webhook security |

### Top risks (priority order)

| ID | Risk | Impact | Mitigation (plan phase) |
|----|------|--------|-------------------------|
| R1 | Unauthenticated inbound webhooks | Message injection, cost abuse | Wave 0: HMAC/signature verification on all Chatwoot routes |
| R2 | AI worker not running in dev/prod | Silent message drop | Wave 0: Document + Docker Compose service for `worker.ts` |
| R3 | `api-auth.ts` never returns response | Public API unusable | Wave 3: Fix middleware + implement `/api/v1/*` |
| R4 | Auth bypass in inbox/AI actions | Cross-tenant access | Wave 1: Session checks on all server actions |
| R5 | 21 scattered SQL files | Migration drift, failed fresh installs | Wave 0: Consolidate into ordered `supabase/migrations/` |
| R6 | `.env.example` incomplete | Silent misconfiguration | Wave 0: Align with `verify-env.ts` + fail-hard boot |
| R7 | In-memory middleware rate limit | Ineffective on serverless | Wave 1: Redis-backed limiter for API; keep IP limit as edge-only |
| R8 | Mock analytics/reputation fallbacks | False green dashboards | Wave 2: Remove prod fallbacks; surface errors |

---

## Project Structure

### Documentation (this feature)

```text
specs/002-nexus-social-platform/
├── plan.md              # This file
├── research.md          # Technology decisions
├── data-model.md        # Entity/schema reference
├── quickstart.md        # End-to-end validation guide
├── contracts/           # HTTP/webhook contracts
│   ├── public-api-v1.md
│   ├── webhooks-inbound.md
│   └── ai-tool-proxies.md
└── tasks.md             # Generated by /speckit.tasks (complete — T001–T024)
```

### Source Code (repository layout)

```text
nexus-social-platform/
├── nexus-social-app/           # Primary Next.js orchestrator
│   ├── src/
│   │   ├── actions/            # Server actions (auth, billing, AI, inbox, posts)
│   │   ├── app/                  # App Router pages + API routes
│   │   ├── bin/                  # worker.ts, migration-worker.ts (REQUIRED processes)
│   │   ├── jobs/                 # ai-orchestration, ai-evaluation, process-migration
│   │   ├── lib/                  # chatwoot, ai, supabase, webhooks, opentelemetry
│   │   ├── middleware/           # api-auth.ts (to wire)
│   │   └── middleware.ts         # Edge middleware (CORS, custom domains)
│   ├── supabase/migrations/      # Target: consolidated ordered migrations
│   ├── e2e/                      # Playwright
│   ├── cypress/e2e/              # Security, billing, integration
│   └── load-tests/               # k6
├── chatwoot/                     # Inbox service (Docker)
├── dify/                         # AI/RAG service (Docker)
├── activepieces/                 # Automation (Docker)
├── nexus-mobile/                 # Expo companion (parallel track)
└── specs/
    ├── 001-production-readiness-hardening/  # Wave 0 (execute first)
    └── 002-nexus-social-platform/           # This plan
```

**Structure Decision**: Single orchestrator app (`nexus-social-app`) with sibling integration repos. Background workers are **first-class deployment units**, not optional scripts.

---

## Implementation Phases

### Wave 0 — Production Hardening Gate (Feature 001)

**Goal:** Close security and operational blockers before feature expansion.

**Execute:** All pending tasks in `specs/001-production-readiness-hardening/tasks.md` (T005–T024).

**Deliverables:**
- Cookie-aware server actions (T005–T008)
- Atomic billing credits (T009)
- OTEL startup (T010), health 503 semantics (T011)
- Migration worker active (T012–T013)
- Redis queue webhook → worker → Dify pipeline (T014–T016)
- HMAC refund approvals (T017)
- API gateway hash + Redis rate limit (T018)
- Feedback webhook SQL fix (T019–T020)
- AI eval cron (T021–T022)
- E2E + OTEL validation (T023–T024)

**Exit criteria:** Playwright AI-02 (kill switch) and AI-03 (HITL) pass; `/api/health` accurate; worker processing verified.

---

### Wave 1 — Secure MVP (Spec US1–US4)

Maps to blueprint Sprints 1–3 + AI Weeks 1–2.

| Workstream | Tasks | Key files |
|------------|-------|-----------|
| **1A Auth & tenancy** | Login gate, workspace resolution, remove auth bypasses | `layout.tsx`, `middleware.ts`, `inbox.ts`, `aiReply.ts`, `MessageComposer.tsx` |
| **1B Content engine** | Calendar + posts + media + caption credits | `createPost.ts`, `generateCaption.ts`, `billing.ts` |
| **1C Unified inbox** | Remove `inbox.ts` stub; wire real Chatwoot UI | `inbox/page.tsx`, `actions/inbox.ts` |
| **1D AI pipeline** | Webhook sig, queue, worker, tenant Dify keys | `chatwoot-ai/route.ts`, `bin/worker.ts`, `ai-orchestration.ts` |
| **1E Schema consolidation** | Ordered migrations, README fix | `supabase/migrations/*.sql` |
| **1F Env contract** | Complete `.env.example`, hard `verifyEnv()` | `.env.example`, `verify-env.ts` |

**Exit criteria:** SC-002 (RLS), SC-003 (PII), SC-004 (AI reply latency), SC-007 (kill switch) test scenarios pass.

---

### Wave 2 — Trust, Billing & Operations (Spec US5–US7)

Maps to AI Weeks 3–5 + Sprints 7–8 + 11.

| Workstream | Tasks | Key files |
|------------|-------|-----------|
| **2A HITL tools** | Real tool integration or documented mocks; magic links | `api/tools/*`, `approve-refund/route.ts` |
| **2B Billing** | Stripe webhooks, credit ledger, no mock keys | `webhooks/stripe/route.ts`, `billing.ts` |
| **2C Analytics & QA** | LLM-as-Judge cron, feedback loop, dashboard | `ai-evaluation.ts`, `ai-performance/page.tsx` |
| **2D Operator controls** | Kill switch UI, canary %, token limits | `ai_agent_configs`, admin settings page |
| **2E Observability** | OTEL collector in compose, Sentry alerts | `docker-compose.prod.yml`, `instrumentation.ts` |

**Exit criteria:** SC-005, SC-006, SC-008; BILL-01 and AI-03 Cypress/Playwright green.

---

### Wave 3 — Platform & Enterprise (Spec US8–US9)

Maps to Sprints 9–10 + 7 enterprise remainder.

| Workstream | Tasks | Key files |
|------------|-------|-----------|
| **3A Public API v1** | Implement routes Cypress expects; wire `api-auth.ts` | `app/api/v1/**`, `middleware/api-auth.ts` |
| **3B Outbound webhooks** | Harden dispatch, retry, signing | `lib/webhooks/dispatch.ts` |
| **3C Automations** | ReactFlow builder → Activepieces execution | `automations/builder/`, `execute-automation.ts` |
| **3D Enterprise** | SSO (Supabase SAML), audit immutability, client portal RLS | `enterprise_schema.sql`, `(client-portal)/` |
| **3E Custom domains** | Implement `/_custom/[hostname]` route | `app/_custom/` (new) |
| **3F Mobile (parallel)** | Expo app in `nexus-mobile/` | Separate release train |

**Exit criteria:** SC-009; PORT-01 client portal isolation; public API contract tests pass.

---

### Wave 4 — Launch Validation

| Activity | Artifact |
|----------|----------|
| Critical QA matrix | `MASTER_BLUEPRINT.md` Part 3 |
| Load tests | `load-tests/*.js` thresholds |
| Migration dry-run | Clean Supabase instance |
| Runbook drill | `docs/AI_INCIDENT_RUNBOOK.md` kill switch |
| Sign-off | SC-011 checklist |

---

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Separate worker process | AI orchestration exceeds serverless timeout; requires BRPOP loop | Inline webhook processing blocks at 100 msg/s and times out on Vercel |
| Four external services | Best-in-class inbox, RAG, automation, payments | Building in-house inbox + LLM pipeline multiplies scope 10× |
| Dual spec tracks (001 + 002) | 001 = hardening delta; 002 = full product roadmap | Merging would obscure release gate vs. vision |

---

## Dependencies Between Waves

```text
Wave 0 (001 hardening) ──blocks──► GA release
        │
        ▼
Wave 1 (Secure MVP) ──blocks──► Wave 2 (Billing/Ops)
        │
        ▼
Wave 2 ──blocks──► Wave 3 (API/Enterprise) for paid/integrator tiers
        │
        ▼
Wave 4 (Launch validation)
```

**Parallel tracks:** `nexus-mobile/` (Sprint 5) and `ml-service/` (Sprint 6) may proceed after Wave 1 auth/RLS patterns are stable.

---

## Post-Design Constitution Re-Check

After Wave 1 design artifacts (`data-model.md`, `contracts/`):

| Principle | Expected state |
|-----------|----------------|
| Multi-Tenancy | All P1 routes enforce session + workspace membership |
| Security | Webhook contracts define signature headers |
| Fail-Closed | quickstart documents Redis-down behavior |
| Observability | Contract includes health + trace expectations |
| Test-Gated | quickstart maps to SEC-01, AI-01, AI-02, BILL-01 |

---

## Next Command

Run **`/speckit.tasks`** to generate `tasks.md` with file-level work items organized by user story and wave.
