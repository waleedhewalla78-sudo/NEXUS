# Research: Nexus Social Platform Technical Decisions

Consolidates architecture choices from `MASTER_BLUEPRINT.md`, feature `001` research, and codebase assessment (2026-06-21).

---

## Decision 1: Composable Microservices vs. Monolith

**Decision:** Next.js orchestrator integrating Supabase, Chatwoot, Dify, Activepieces, Stripe, Redis.

**Rationale:** Blueprint explicitly targets open-source best-of-breed components. Nexus owns tenancy, security boundaries, and workflow glue—not channel delivery or LLM hosting.

**Alternatives considered:**
- *Full monolith with embedded inbox/LLM:* Rejected—12+ month scope inflation.
- *Headless SaaS only (API-only):* Rejected—agency users require unified dashboard UX.

---

## Decision 2: Multi-Tenancy Enforcement Layer

**Decision:** PostgreSQL RLS via `workspace_members` join on all tenant tables; server actions must use cookie-aware Supabase client and verify membership before mutations.

**Rationale:** Defense in depth—RLS is last line when application code mis-scopes a query. Current gaps (`inbox.ts`, hardcoded user IDs) prove app-layer checks alone are insufficient.

**Alternatives considered:**
- *Application-only filtering:* Rejected—SEC-01 requires DB-level isolation proof.
- *Schema-per-tenant:* Rejected—operational cost at agency scale.

---

## Decision 3: AI Message Processing Topology

**Decision:** Synchronous webhook listener (kill switch + canary + enqueue) → Redis FIFO (`queue:ai-orchestration`) → standalone `src/bin/worker.ts` BRPOP consumer → `ai-orchestration.ts` job.

**Rationale:** Matches blueprint Week 2/5; satisfies SC-010 (100 msg/s) without blocking HTTP; aligns with 001-T014–T016.

**Alternatives considered:**
- *Inngest/Vercel background:* Viable for production but worker already implemented; migration deferred post-MVP.
- *BullMQ:* Rejected in 001 research—overhead for simple FIFO.

---

## Decision 4: Per-Workspace AI Isolation

**Decision:** `ai_agent_configs` stores `dify_app_id`, `dify_dataset_id`, `dify_app_api_key` per workspace; provisioning via `ai-agent-provision.ts` on workspace creation.

**Rationale:** Blueprint Week 1 mandate; prevents cross-tenant RAG leakage (AI Week acceptance scenario 1).

**Alternatives considered:**
- *Shared Dify app with metadata filter:* Rejected—insufficient isolation for enterprise clients.

---

## Decision 5: PII Handling Before External AI

**Decision:** Central `redactPII()` in `src/utils/pii.ts` applied to all outbound AI payloads (captions, reply assist, orchestration).

**Rationale:** GDPR/CCPA compliance test AI-01; must not rely on Dify-side redaction alone.

**Alternatives considered:**
- *Prompt-only "do not repeat PII":* Rejected—non-deterministic; fails compliance audit.

---

## Decision 6: Human-in-the-Loop for Destructive Tools

**Decision:** Read tools autonomous; write tools (refund) return `pending_approval` → HMAC-signed magic link → `approve-refund` route executes once.

**Rationale:** Blueprint Week 3; eliminates unauthorized financial actions (AI-03).

**Alternatives considered:**
- *Database approval queue only:* Rejected—requires extra round-trips; links enable email/Chatwoot approval UX.

---

## Decision 7: AI Credit Ledger Concurrency

**Decision:** PostgreSQL `CHECK (total_credits >= used_credits)` + atomic RPC/`UPDATE ... WHERE used_credits + N <= total_credits` in `billing.ts`.

**Rationale:** BILL-01 concurrent exhaustion test; in-memory counters fail across instances.

**Alternatives considered:**
- *Optimistic locking only:* Insufficient under high concurrency without constraint.

---

## Decision 8: Public API Authentication

**Decision:** SHA-256 hashed API keys in `api_keys` table; Redis sliding window rate limit per workspace; middleware at `src/middleware/api-auth.ts` applied to `/api/v1/*`.

**Rationale:** Sprint 9; 001 Decision 2; must work across horizontally scaled containers.

**Alternatives considered:**
- *JWT for API clients:* Deferred—API keys simpler for integrator MVP.

**Current gap:** Middleware validates but does not return `NextResponse.next()`—must fix before Wave 3.

---

## Decision 9: Webhook Authenticity

**Decision:** Chatwoot webhooks verify shared secret or HMAC signature header before enqueue; Stripe uses official signature verification; reject unsigned POSTs with 403.

**Rationale:** WA-01 / blueprint critical path; current open POST endpoints are **R1 critical risk**.

**Alternatives considered:**
- *IP allowlisting only:* Insufficient for cloud-deployed Chatwoot.

---

## Decision 10: SQL Migration Strategy

**Decision:** Consolidate 21 root-level `*.sql` files into ordered `supabase/migrations/YYYYMMDDHHMMSS_description.sql`; single README migration path.

**Rationale:** Fresh install failures and README drift (`sprint11_schema.sql` path wrong) block onboarding.

**Alternatives considered:**
- *Manual SQL editor only:* Rejected—not reproducible for CI/staging.

---

## Decision 11: Environment Boot Contract

**Decision:** Expand `.env.example` to match all required vars; `verifyEnv()` throws on missing critical keys in production (`NODE_ENV=production`).

**Rationale:** README claims strict boot; current soft-fail hides misconfiguration until runtime.

**Required vars (minimum):** `NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY`, `DIFY_API_KEY`, `INTERNAL_TOOL_SECRET`, `REDIS_URL`, `JWT_SECRET` (or `APPROVAL_HMAC_SECRET`), `STRIPE_*`, `CRON_SECRET`, `CHATWOOT_*`.

---

## Decision 12: Deployment Topology (Dev & Prod)

**Decision:**

| Process | Command | Port |
|---------|---------|------|
| Next.js app | `npm run dev` / standalone | 3000 |
| AI worker | `npx ts-node src/bin/worker.ts` | — |
| Migration worker | `npx ts-node src/bin/migration-worker.ts` | — |
| Redis | `docker compose -f docker-compose.redis.yml up` | 6379 |
| Integrations | Sibling repo Docker stacks | 3002–3004 |

**Rationale:** Worker not running was root cause of "AI silent failure" in local testing.

---

## Decision 13: Testing Pyramid

**Decision:** Vitest for tool proxy contracts; Playwright for AI critical paths (kill switch, HITL); Cypress for RLS/billing; k6 for load thresholds in blueprint Part 3.

**Rationale:** Matches existing repo layout; SC-011 launch gate.

**Gap:** Playwright AI-01 still manual—Wave 2 must add network intercept assertion or DB log check.

---

## Decision 14: Mobile & ML (Deferred Tracks)

**Decision:** `nexus-mobile/` (Expo) and Python FastAPI ML service are **parallel releases** after Wave 1 RLS/auth patterns stabilize—not GA blockers for web MVP.

**Rationale:** Sprint 5/6 scaffolds incomplete; web dashboard is authoritative MVP surface per spec assumptions.

---

## Open Items (resolved for planning—no NEEDS CLARIFICATION)

| Item | Resolution |
|------|------------|
| Queue library | Redis BRPOP (Wave 0) |
| Auth method | Supabase SSR session cookies |
| Billing provider | Stripe |
| AI platform | Dify per-tenant apps |
| Inbox platform | Chatwoot with custom UI |
