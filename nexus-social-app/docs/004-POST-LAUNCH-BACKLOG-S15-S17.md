# Feature 004 — Post-Launch Engineering Backlog (Sprints 15–17)

**Status:** V1.0 Go-Live Ready — backlog items are **post-launch**, not release blockers.  
**Source of truth:** Gap Analysis Doc 02 (`specs/004-ai-cmo-master-prd-v3/architecture-audit/02-gap-analysis-matrix.md`)  
**V1.0 boundary:** Authoritative spec `specs/004-ai-cmo-enterprise/spec.md` (Phases 0–8 complete)  
**Audience:** Engineering leads importing stories into Jira / Linear / Azure DevOps

---

## V1.0 Scope Boundary (Do Not Re-Open)

The following gap IDs are **closed in V1.0** and must **not** appear as pending work in this backlog:

| Gap ID | V1.0 State | Evidence |
|--------|------------|----------|
| C1 | Closed | Inngest `campaign-workflow` + 4 registered functions |
| C2 | Closed | `marketing-event-worker` + `redis-to-inngest` bridge in `worker.ts` |
| C3 | Closed | `budget-guard.ts`, `cost-ledger.ts`, `ai_cmo_budget_policies` |
| C4 | Closed | Migration `000014`, agency hierarchy schema |
| C5 | Closed | `202` + poll API, `campaign-job-store.ts` |
| C6 | **Partial** | PG `MemoryRepository` wired; Qdrant remains stub → **S15 backlog only** |
| C7 | Closed | `secure-reconciler-writer.ts` rate limit (100/min/workspace) |
| C8 | Closed | `ai_cmo_approval_requests` + `routeToApproval()` |
| H1 | Closed | `optimizer-agent.ts` + `trigger-replan` + INT-02 LLM path |
| H2 | Closed | `outcome-ingestion.ts` cron |
| H3 | Closed | `quality-evaluator.ts` LLM-as-Judge |
| H4 | Closed | `link-post` step + `campaign-post-linker.ts` |
| H6 | Closed | `policy-engine-v2.ts` (6 structured rules) |
| H7 | Closed | `circuit-breaker.ts` |
| H8 | Partial | Inngest retries (3/2/1); no dedicated DLQ table → optional S16 |
| H9 | Closed | `mv-refresh` hourly cron |
| H12 | Closed | `ProviderRouter` (Dify → OpenRouter) |
| H13 | Closed | `pii-scrubber.ts` in reconciler path |
| H14 | Closed | Evaluation + confidence persistence in workflow deps |
| INT-01 | Closed | `startRedisToInngestBridge()` in worker |
| INT-02 | Closed | Optimizer uses `providerRouter.generate()` + `traceAgentCall` |

**V1.0 operational agents:** Strategic Brain, Creator, Optimizer (Tier 1).  
**V1.0 deferred:** Radar, Quant, Sentinel, Finance, Compliance (Tier 3 skeletons), full Qdrant, enterprise IdP, pentest.

---

## Story Format (Jira / Linear Import Schema)

Each backlog item uses this schema:

```yaml
gap_id: H5                    # Original Doc 02 ID
epic: Agent Mesh Expansion    # Epic name
story_id: S15-004-001         # Internal story ID
title: string                 # Imperative user-story title
sprint: 15                    # Target sprint
priority: High                # Critical | High | Medium | Low
v1_blocker: false             # Always false for this document
acceptance_criteria:          # Testable AC list
  - ...
technical_dependencies:       # Files, env vars, upstream stories
  - ...
out_of_scope:                 # Explicit non-goals
  - ...
```

---

## Epic 1 — Agent Mesh Expansion

**Epic goal:** Flesh out Phase 7 skeleton agents with production domain logic.  
**Pre-built (do not rebuild):** `AbstractBaseAgent`, `agents/registry.ts`, `ProviderRouter`, `emitAgentEvent()`, Zod input schemas, Inngest event names in `types/events.ts`.

---

### S15-004-001 — Radar Agent: External Signal Ingestion

| Field | Value |
|-------|-------|
| **Gap ID** | H5 |
| **Epic** | Agent Mesh Expansion |
| **Sprint** | 15 |
| **Priority** | High |

**Title:** Wire Radar agent to 003 listening data and emit production `ai-cmo/signal.detected` events

**Current state:** `src/lib/ai-cmo/agents/radar-agent.ts` — skeleton with stub feed (`stub-feed`), minimal LLM prompt, event emitter works (`agent-mesh.test.ts`).

**Acceptance criteria:**
- [ ] Radar consumes real signals from 003 `listening_queries` / `mentions` (or configured webhook ingest), not stub feed
- [ ] Each signal above relevance threshold emits `ai-cmo/signal.detected` with workspace + campaign context
- [ ] Worker or Inngest cron runs Radar on schedule (≤5 min latency from mention ingest)
- [ ] Radar output persisted as **proposal only**; optional human-validated learning via reconciler (separate story)
- [ ] Unit tests cover real signal shape + event payload; no SoR direct writes from agent

**Technical dependencies:**
- `src/lib/ai-cmo/agents/radar-agent.ts`
- `src/lib/ai-cmo/agents/types/intelligence.ts`
- 003 listening tables / APIs
- S14-T003 marketing event consumer (closed)

**Out of scope:** Twitter/Google Trends API keys (vendor procurement); use 003 mentions as V1.5 data source first.

---

### S15-004-002 — Channel Risk Agent: Platform TOS Heatmap API

| Field | Value |
|-------|-------|
| **Gap ID** | M6 |
| **Epic** | Agent Mesh Expansion |
| **Sprint** | 15 |
| **Priority** | Medium |

**Title:** Implement Channel Risk scoring API with per-platform TOS risk heatmap

**Current state:** Event types exist in PRD Module T; no dedicated agent file or API route.

**Acceptance criteria:**
- [ ] `GET /api/v1/ai-cmo/channel-risk?workspaceId=` returns per-platform scores (LinkedIn, X, Instagram, etc.)
- [ ] Scores derived from ruleset (rate limits, content type restrictions, historical rejection rates)
- [ ] Response includes `riskTier`, `factors[]`, `lastUpdatedAt`
- [ ] Integrated into `structured-policy-review` as advisory input (does not override CRITICAL tier logic)
- [ ] API tests + workspace auth via `x-api-key`

**Technical dependencies:**
- New module: `src/lib/ai-cmo/channel-risk/` (recommended)
- `policy-engine-v2.ts` (read-only advisory hook)
- 003 publish failure analytics (optional enrichment)

**Out of scope:** Live TOS web scraping; use curated rules JSON in repo for V1.5.

---

### S16-004-003 — Finance Agent: Stripe Pipeline ROI

| Field | Value |
|-------|-------|
| **Gap ID** | M5 |
| **Epic** | Agent Mesh Expansion |
| **Sprint** | 16 |
| **Priority** | High |

**Title:** Connect Finance agent to Stripe/billing pipeline for true campaign ROI

**Current state:** `src/lib/ai-cmo/agents/finance-agent.ts` — skeleton; computes ROI from input props only, no Stripe.

**Acceptance criteria:**
- [ ] Finance agent reads `ai_cmo_cost_ledger` + Stripe invoice/charge refs (or 003 billing table when available)
- [ ] Returns `FinanceProposal` with `roi`, `roas`, `spendUtilizationPct`, `budgetReallocationHints` grounded in real data
- [ ] Proposals emitted to workflow or dashboard; persistence via `secureSyncToSoR` only from orchestrator
- [ ] Unit tests with Stripe mock fixtures
- [ ] FinOps MV `ai_cmo_cost_summary` reconciles with agent output ±1%

**Technical dependencies:**
- `finance-agent.ts`, `agents/types/business.ts`
- Stripe webhook or batch sync job (new)
- `ai_cmo_cost_ledger`, `ai_cmo_campaign_outcomes`

**Out of scope:** Automated budget reallocation (human approval required).

---

### S16-004-004 — Quant Agent: Deep Statistical Analysis

| Field | Value |
|-------|-------|
| **Gap ID** | M7 |
| **Epic** | Agent Mesh Expansion |
| **Sprint** | 16 |
| **Priority** | Medium |

**Title:** Implement Quant agent statistical analysis and Brain memory hooks

**Current state:** `src/lib/ai-cmo/agents/quant-agent.ts` — CTR/trend heuristics + thin LLM prompt; **no unit test** in `agent-mesh.test.ts`.

**Acceptance criteria:**
- [ ] Quant consumes `ai-cmo/analytics.synced` events (or outcome-ingestion output)
- [ ] Produces `QuantInsightProposal` with confidence intervals, trend classification, `brainHints[]`
- [ ] `retrieve-memory` step can rank Quant-derived learnings when `learning_type = 'audience'|'channel'`
- [ ] Prompt engineering doc checked into `specs/` with golden test fixtures
- [ ] Dedicated unit test in `agents/__tests__/quant-agent.test.ts`

**Technical dependencies:**
- `quant-agent.ts`, `outcome-ingestion.ts`
- `memory-repository.ts`
- `AI_CMO_INNGEST_EVENT_NAMES.ANALYTICS_SYNCED`

**Out of scope:** ML model training; LLM + SQL aggregates only.

---

### S16-004-005 — Sentinel Agent: Time-Series Anomaly Detection

| Field | Value |
|-------|-------|
| **Gap ID** | M8 |
| **Epic** | Agent Mesh Expansion |
| **Sprint** | 16 |
| **Priority** | High |

**Title:** Wire Sentinel to time-series metrics and emit `ai-cmo/anomaly.detected`

**Current state:** `src/lib/ai-cmo/agents/sentinel-agent.ts` — skeleton with default stub anomaly when input empty; emits events (tested).

**Acceptance criteria:**
- [ ] Sentinel runs on schedule against `post_analytics` / `ai_cmo_campaign_outcomes` time series
- [ ] Configurable threshold (default 30% drop) per metric (engagement_rate, ctr, conversions)
- [ ] Emits `ai-cmo/anomaly.detected` with severity mapped to drop percentage
- [ ] Optional trigger: underperforming event coalescing (no duplicate replan storms)
- [ ] Integration test: seeded analytics → anomaly event → optional Sentinel→Optimizer handoff (design doc)

**Technical dependencies:**
- `sentinel-agent.ts`, 003 `post_analytics`
- Worker cron or Inngest function (new: `sentinel-scan` optional)
- AI Ops playbook runaway protections

**Out of scope:** Full Datadog/Prometheus integration (use Supabase queries V1.5).

---

### S16-004-006 — Compliance Agent: MENA PDPL/DPL Prompt Mapping

| Field | Value |
|-------|-------|
| **Gap ID** | H11 |
| **Epic** | Agent Mesh Expansion |
| **Sprint** | 16 |
| **Priority** | High |

**Title:** Expand Compliance agent with locale-specific legal prompt library (UAE PDPL, Egypt DPL)

**Current state:** `src/lib/ai-cmo/agents/compliance-agent.ts` — heuristic regex + thin LLM; `augmentsPolicyEngine: true`, does not replace Policy Engine V2.

**Acceptance criteria:**
- [ ] Jurisdiction prompt packs for `uae_pdpl`, `egypt_dpl`, `eu_gdpr` in versioned JSON/YAML
- [ ] Agent reads `tenants.data_region` and content locale to select rule pack
- [ ] Output feeds approval queue as **advisory**; Policy Engine V2 remains authoritative for CRITICAL blocks
- [ ] Tests: `ar-AE` personal data caption → PDPL advisory; regulated claims → Egypt DPL critical advisory
- [ ] Legal review sign-off recorded in spec before GA of compliance packs

**Technical dependencies:**
- `compliance-agent.ts`, `data-residency.ts`
- `policy-engine-v2.ts` (no replacement)
- Migration `000014` `tenants.data_region`

**Out of scope:** Replacing human legal review for CRITICAL tier.

---

### S15-004-007 — Brain ← Radar Memory Hook

| Field | Value |
|-------|-------|
| **Gap ID** | H5 (sub-story) |
| **Epic** | Agent Mesh Expansion |
| **Sprint** | 15 |
| **Priority** | Medium |

**Title:** Inject Radar signal summaries into Strategic Brain plan prompt via MemoryRepository

**Acceptance criteria:**
- [ ] When Radar events exist in last 7 days, `plan` step plan JSON references competitor/trend context
- [ ] Unit test with seeded signal learnings
- [ ] No change to SoR write path from Brain

**Technical dependencies:** S15-004-001, `memory-repository.ts`, `strategic-brain.ts`

---

## Epic 2 — Intelligence & Vector Hardening

**Epic goal:** Move memory layer from PG-primary + Qdrant stub to production hybrid semantic search.

---

### S15-004-010 — Qdrant Full Implementation (C6 Completion)

| Field | Value |
|-------|-------|
| **Gap ID** | C6, L3 |
| **Epic** | Intelligence & Vector Hardening |
| **Sprint** | 15 |
| **Priority** | Critical |

**Title:** Replace Qdrant stub with production upsert + semantic search in MemoryRepository

**Current state:** `src/lib/ai-cmo/memory/qdrant-client.stub.ts` — hash-based placeholder vectors; PG fallback active.

**Acceptance criteria:**
- [ ] Install `@qdrant/js-client-rest` in production; `QDRANT_URL` + `QDRANT_API_KEY` documented
- [ ] Real embedding service wired (OpenRouter embedding or Dify) — no hash placeholder in prod path
- [ ] Upsert on learning write path (reconciler hook or post-sync job) to `ws_{workspaceId}_learnings`
- [ ] `MemoryRepository.retrieve()` merges PG + Qdrant results with dedupe by learning ID
- [ ] Feature flag `QDRANT_ENABLED=true`; PG-only fallback when disabled
- [ ] Tests: mock Qdrant client + integration test with testcontainer (optional)

**Technical dependencies:**
- `qdrant-client.stub.ts` → rename/split to `qdrant-client.ts`
- `memory-repository.ts`, `uniqueness-guard.ts` (Qdrant path)
- `secure-reconciler-writer.ts` (post-write hook or async indexer)

**Out of scope:** Re-embedding entire historical corpus (batch job = separate story).

---

### S15-004-011 — VectorStore Abstraction (L3)

| Field | Value |
|-------|-------|
| **Gap ID** | L3 |
| **Epic** | Intelligence & Vector Hardening |
| **Sprint** | 15 |
| **Priority** | Medium |

**Title:** Introduce `VectorStore` interface to decouple Qdrant from MemoryRepository

**Acceptance criteria:**
- [ ] Interface: `upsert`, `search`, `delete`, `healthCheck`
- [ ] Implementations: `QdrantVectorStore`, `PostgresFallbackVectorStore`
- [ ] `MemoryRepository` depends on interface only
- [ ] Swap test proves PG fallback when Qdrant unhealthy

**Technical dependencies:** S15-004-010

---

### S16-004-012 — Knowledge Hub: Extend Beyond Post Analytics RAG

| Field | Value |
|-------|-------|
| **Gap ID** | M3 |
| **Epic** | Intelligence & Vector Hardening |
| **Sprint** | 16 |
| **Priority** | Medium |

**Title:** Extend Knowledge Hub source registry beyond post analytics ingest

**Current state:** `src/jobs/ingest-post-analytics-rag.ts` — Dify dataset ingest for analytics summaries only.

**Acceptance criteria:**
- [ ] Source registry config: documents (PDF/URL), CRM export, brand guidelines, competitor briefs (11 sources per PRD Module J — phased)
- [ ] Each source type has ingest adapter following `ingest-post-analytics-rag.ts` pattern
- [ ] Source metadata stored with workspace scope; PII scrubbed before index
- [ ] Brain `retrieve-memory` can query Knowledge Hub namespace
- [ ] At least 3 new source types implemented + tested in S16

**Technical dependencies:**
- `ingest-post-analytics-rag.ts` pattern
- Dify datasets or Qdrant collections (post S15-004-010)
- `pii-scrubber.ts`

**Out of scope:** All 11 sources in one sprint; deliver registry + 3 adapters.

---

## Epic 3 — Enterprise Security, Scale & Productization

**Epic goal:** Close the final ~4% enterprise readiness gap (96→100): security validation, IdP, UI, E2E proof.

---

### S17-004-020 — Post-Deploy Penetration Test: `/api/inngest` + AI CMO API

| Field | Value |
|-------|-------|
| **Gap ID** | POST-SEC-001 (new — security hardening) |
| **Epic** | Enterprise Security & Scale |
| **Sprint** | 17 |
| **Priority** | Critical |

**Title:** Execute third-party penetration test on Inngest webhook and AI CMO API surface

**Verification note:** Current SRE runbooks (`004-SRE-RUNBOOK.md`, `004-PRODUCTION-READINESS.md`) document Inngest sync and health checks but **do not yet** include a formal pentest step — this story closes that gap.

**Acceptance criteria:**
- [ ] Scope includes: `POST/GET /api/inngest`, `POST /api/v1/ai-cmo/campaigns`, job poll endpoints, Inngest signing key validation, SSRF via webhook payloads
- [ ] Test executed on **staging mirroring production** after V1.0 go-live (not a V1.0 blocker)
- [ ] All Critical/High findings remediated or accepted with compensating controls documented
- [ ] Summary added to `docs/004-PRODUCTION-READINESS.md` § Security Verification
- [ ] Re-test confirms `/api/inngest` rejects unsigned/forged payloads

**Technical dependencies:**
- V1.0 deployed to staging/production
- `INNGEST_SIGNING_KEY`, workspace API key auth

---

### S17-004-021 — Enterprise IdP: Keycloak / SAML / SCIM

| Field | Value |
|-------|-------|
| **Gap ID** | POST-B |
| **Epic** | Enterprise Security & Scale |
| **Sprint** | 17 |
| **Priority** | High |

**Title:** Upgrade workspace authentication to enterprise IdP (Keycloak SAML + SCIM provisioning)

**Acceptance criteria:**
- [ ] SAML SSO login path for enterprise tenants
- [ ] SCIM user/group sync to workspace membership
- [ ] Existing `x-api-key` campaign API auth unchanged for automation
- [ ] Tenant admin can enforce SSO-only for workspace
- [ ] Security review + pentest story S17-004-020 updated with SSO attack surface

**Technical dependencies:**
- Supabase Auth or NextAuth enterprise config
- `agencies` / `agency_members` hierarchy (closed V1.0)

**Out of scope:** Consumer social login changes (003 OAuth unchanged).

---

### S16-004-022 — AI Ops Dashboard (H10)

| Field | Value |
|-------|-------|
| **Gap ID** | H10 |
| **Epic** | Enterprise Security & Scale |
| **Sprint** | 16 |
| **Priority** | Medium |

**Title:** Build `/admin/ai-ops` dashboard for agent latency, error rate, circuit state

**Acceptance criteria:**
- [ ] Page shows: campaign workflow success rate, agent p95 latency (Langfuse embed or API), open circuits, bridge consumer lag
- [ ] Links to Langfuse traces by workspace
- [ ] Maps to metrics defined in `docs/004-AI-OPS-PLAYBOOK.md`

**Technical dependencies:**
- Langfuse keys (production)
- `004-AI-OPS-PLAYBOOK.md` SLO definitions

---

### S17-004-023 — Hierarchy UI + Tenant RLS (M9, M11)

| Field | Value |
|-------|-------|
| **Gap ID** | M9, M11 |
| **Epic** | Enterprise Security & Scale |
| **Sprint** | 17 |
| **Priority** | High |

**Title:** Tenant admin UI — brand picker, agency settings, tenant-scoped RLS verification

**Acceptance criteria:**
- [ ] Operator switches brand; campaigns scoped to `brandId`
- [ ] Tenant admin settings for agency hierarchy
- [ ] RLS integration test: cross-tenant SELECT denied on `ai_cmo_*`
- [ ] Manual UAT script in docs

**Technical dependencies:**
- Migration `000014` (closed)
- Nexus UI campaign surfaces

---

### S17-004-024 — E2E Playwright Campaign Smoke (M15)

| Field | Value |
|-------|-------|
| **Gap ID** | M15 |
| **Epic** | Enterprise Security & Scale |
| **Sprint** | 17 |
| **Priority** | High |

**Title:** Playwright E2E — POST campaign → poll → published status

**Acceptance criteria:**
- [ ] CI job runs against staging with mocked LLM or test workspace
- [ ] Covers happy path + budget blocked + approval required paths
- [ ] Complements manual UAT (`docs/UAT-004-POSTMAN-COLLECTION.md`)

**Technical dependencies:**
- V1.0 deployed staging
- Test workspace API key in CI secrets

---

### S16-004-025 — Portfolio S&OP Executive Scenarios (M4)

| Field | Value |
|-------|-------|
| **Gap ID** | M4 |
| **Epic** | Enterprise Security & Scale |
| **Sprint** | 16 |
| **Priority** | Low |

**Title:** Cross-brand budget optimizer API for executive tradeoff scenarios

**Acceptance criteria:**
- [ ] `GET /api/v1/ai-cmo/portfolio/scenarios` for tenant with 2+ brands
- [ ] Returns budget reallocation scenarios with projected ROI ranges
- [ ] Finance agent proposals inform scenario generation

**Technical dependencies:** S16-004-003 (Finance agent)

---

### S16-004-026 — Redis Stream Sharding (M13)

| Field | Value |
|-------|-------|
| **Gap ID** | M13 |
| **Epic** | Enterprise Security & Scale |
| **Sprint** | 16 |
| **Priority** | Low |

**Title:** Partition marketing event stream by tenant hash for 5k workspace scale

**Acceptance criteria:**
- [ ] Stream key strategy documented and implemented
- [ ] Bridge + 003 consumers support multi-stream or consistent hashing
- [ ] Load test: 1000 events/min without consumer lag >60s

**Technical dependencies:**
- `redis-to-inngest.ts`, `marketing-event-worker.ts`

---

## Sprint Allocation Summary

| Sprint | Theme | Primary stories | Gap IDs |
|--------|-------|-----------------|---------|
| **15** | External intel + vector foundation | S15-004-001, 002, 007, 010, 011 | H5, M6, C6, L3 |
| **16** | Agent mesh + knowledge + ops UI | S16-004-003–006, 012, 022, 025, 026 | M5, M7, M8, H11, M3, H10, M4, M13 |
| **17** | Productization + security gate | S17-004-020–024 | POST-SEC, POST-B, M9, M11, M15 |

**Estimated story count:** 18 core stories (expand sub-tasks in Jira as needed).

---

## Agentic Verification Log (Pre-Write)

| Check | Result |
|-------|--------|
| Phase 7 skeletons are stubs awaiting domain logic | **PASS** — `radar-agent.ts` uses `stub-feed`; `sentinel-agent.ts` injects default anomaly; `finance-agent.ts` props-only ROI |
| `qdrant-client.stub.ts` exists | **PASS** — hash placeholder vectors, PG primary |
| SRE runbook lists pentest on `/api/inngest` | **FAIL** — not in current runbooks; captured as **S17-004-020** |
| No V1.0 closed gaps listed as pending | **PASS** — boundary table above |

---

## Import Notes for PM Tools

**Jira:** Create 3 Epics → import stories as Tasks linked to Epic → add `gap_id` as custom field.  
**Linear:** Project Feature 004 → cycles Sprint 15/16/17 → labels: `gap:H5`, `tier:post-launch`, `v1-blocker:false`.

**Labels for all stories:**
- `feature-004`
- `post-launch`
- `not-v1-blocker`

---

## Related Documents

- V1.0 deploy: `docs/004-PRODUCTION-READINESS.md`
- On-call: `docs/004-SRE-RUNBOOK.md`, `docs/004-AI-OPS-PLAYBOOK.md`
- UAT: `docs/UAT-004-POSTMAN-COLLECTION.md`
- Gap matrix: `specs/004-ai-cmo-master-prd-v3/architecture-audit/02-gap-analysis-matrix.md`
