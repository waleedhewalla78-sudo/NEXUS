# Clarifications: AI CMO PRD v3.0 (Sprint 12)



Resolved ambiguities for implementation. These decisions supersede PRD defaults where noted.



## CL-001: Event Bus — Redis Streams vs Upstash Kafka



**Decision:** Use **Redis Streams** via existing `ioredis` (`REDIS_URL`, `src/lib/cache.ts` pattern).



**Rationale:** `ioredis` is already a production dependency for workers and caching. Upstash Kafka is not in `package.json` and adds infra cost without proven need at Sprint 12 scale.



**Implementation:** `src/lib/events/marketing-event-bus.ts` — `XADD` to `marketing:events`, consumer groups, idempotency keys in Redis `SET NX`.



**Future:** Swap transport behind `MarketingEventBus` interface if Kafka is approved (Sprint 13+).



## CL-002: Orchestration — Inngest vs Temporal



**Decision:** **Scaffold without new npm dependency.** Interface + `campaign-workflow.ts` pure-function skeleton in `src/lib/orchestration/`. Document Inngest install in `src/lib/orchestration/README.md`.



**Rationale:** PRD prefers Inngest; adding deps requires explicit approval. Skeleton preserves workflow steps (plan → policy → memory → quality → publish) for drop-in Inngest wiring.



**Future:** `npm install inngest` + `src/app/api/inngest/route.ts` when approved.



## CL-003: `ai_cmo_campaigns` vs Existing `posts`



**Decision:** **Map, don't duplicate.**



| Concept | Table | Notes |

|---------|-------|-------|

| Campaign (AI CMO orchestration unit) | `ai_cmo_campaigns` | Metadata: objective, status, brand |

| Content execution | `posts` | Existing publish pipeline (Feature 003) |

| Link | `ai_cmo_campaigns.post_id → posts.id` | One primary post per campaign |

| Content pieces (evaluations) | `ai_cmo_content_pieces` | Optional `post_id` FK; content JSONB for pre-publish drafts |



Do **not** create a parallel `campaigns` table or duplicate post content in campaign rows.



## CL-004: Hierarchy Migration for Existing Workspaces



**Decision:** Non-destructive backfill in migrations `20260624_000011_ai_cmo_hierarchy.sql` + `20260624_000012_ai_cmo_foundation.sql` (or combined `RUN_IN_SQL_EDITOR_004_sprint12.sql`):



1. Insert default tenant per workspace missing `tenant_id`.

2. Set `workspaces.tenant_id` for all NULL rows.

3. Brands created per workspace in hierarchy migration where applicable.

4. `tenant_id` remains nullable on schema for forward compatibility; backfill ensures zero orphan workspaces.



Existing RLS on `workspace_members` remains the primary access boundary; tenant RLS is additive for agency roll-ups (Sprint 13 UI).



## CL-005: Dify Client Reference (updated Sprint 13)



**Decision:** `src/lib/dify/client.ts` provides **agent runtime only** (`sendDifyChatMessage`). Orchestration remains in `src/lib/orchestration/`. Strategic Brain and Creator agents call Dify first, OpenRouter second.

Workspace keys from `ai_agent_configs.dify_app_api_key` override `DIFY_API_KEY` env.



## CL-006: Regression Boundary with Feature 003



Sprint 12–13 additions are **additive**. Sprint 13 adds `src/lib/{dify,ai-cmo,explainability}` and API routes under `/api/v1/ai-cmo/`. Reconciler write path is opt-in via `campaign-service.ts` — publish worker unchanged.

## CL-007: Migration 000011 vs 000012 Split (2026-06-24)

User applied **000011** then **000012** in Supabase SQL Editor. All 11 Feature 004 tables verified via `schema:verify:004` (2026-06-24). For fresh environments, use `RUN_IN_SQL_EDITOR_004_sprint12.sql` (combined) or apply numbered migrations in order.

---

## Clarification Index (CL-008+)

| CL | Area | Decision status |
|----|------|-----------------|
| CL-008 | Orchestration | Pending leadership |
| CL-009 | Observability | Pending leadership |
| CL-010 | Hierarchy | Pending leadership |
| CL-011 | Dify topology | Resolved (engineering default) |
| CL-012 | Event bus long-term | Resolved (Redis Streams v1) |
| CL-013 | Memory retrieval | Resolved (hybrid) |
| CL-014 | Approval queue | Resolved (engineering default) |
| CL-015 | Campaign → post wiring | Resolved (contract defined) |
| CL-016 | FinOps enforcement | Pending leadership |
| CL-017 | SEO / programmatic pages | Deferred |
| CL-018 | Multi-region / DR v1 | Resolved (single-region v1) |
| CL-019 | PDPL / GDPR residency | Pending leadership |
| CL-020 | Meta App Review vs manual token | Pending leadership |
| CL-021 | AI-to-human approval ratio | Pending leadership |
| CL-022 | 5,000-workspace gate criteria | Resolved (audit checklist) |

**Format (CL-008+):** Area · Ambiguity · Options · Recommendation · Decision · Impact if unresolved

---

## CL-008: Orchestration — Inngest vs Temporal vs Redis-Only

**Area:** Orchestration (Module A)

**Ambiguity:** CL-002 deferred Inngest install and shipped a Redis BRPOP + pure-function skeleton (Sprint 14 partial). Audit doc 04 recommends Inngest; IMPLEMENT_PLAN notes Redis fallback is active but lacks step-level durability, unified DLQ, and human-in-the-loop pause. Unclear whether Redis-only is acceptable for Beta (100 ws) or must be replaced before any external GA.

**Options:**

| Option | Description | Tradeoffs |
|--------|-------------|-----------|
| A — **Inngest** | TypeScript-native durable workflows; `step.run()` retries; bridge from Redis Streams | SaaS/self-host decision; new npm dep; best Next.js fit (doc 04) |
| B — **Temporal** | Gold-standard durability and saga compensation | Self-host or Cloud cost; heavier ops; team expertise required |
| C — **Redis-only** | Extend current `campaign-orchestration.ts` BRPOP + Streams consumers | No leadership approval; two queue systems; manual DLQ/scheduling; fails 99.9% SLO at 5k ws |
| D — **Hybrid interim** | Redis async 202 for Beta; Inngest migration before 1k ws gate | Buys time; duplicate orchestration paths; tech debt if not time-boxed |

**Recommendation:** **Option A (Inngest)** for production path; **Option D** only if A-GATE-001 blocked >2 weeks, with hard sunset at Beta gate. Re-evaluate Temporal only if workflows exceed 24h or need complex compensation (doc 04).

**Decision:** **Pending leadership** (A-GATE-001). Supersedes CL-002 interim stub when approved.

**Impact if unresolved:** Blocks B-ORCH-001–002, event→Inngest bridge (B-ORCH-005), approval resume, and load test H-PROD-007. Sync/fragile Redis path remains sole orchestrator.

**Cross-ref:** `analysis.md` R1, C1; gap matrix C1/C5; `implementation-plan.md` LD-1.

---

## CL-009: Observability — Langfuse vs OTel-Only

**Area:** Observability (Module N)

**Ambiguity:** No OTel instrumentation or Langfuse in `package.json`. Audit doc 10 recommends Langfuse + OTel; constitution requires AI Ops at scale. Unclear minimum viable stack for Beta vs 5k gate.

**Options:**

| Option | Description | Tradeoffs |
|--------|-------------|-----------|
| A — **Langfuse + OTel** | OTel SDK everywhere; Langfuse for LLM traces/evals; Sentry for errors | Best debug at 5k ws; PII scrub required; self-host option for residency |
| B — **OTel-only + custom traces** | OTel → collector; optional `ai_cmo_traces` Postgres table | No new vendor; higher build cost; weak prompt versioning |
| C — **Sentry + structured logs only** | Extend existing error capture | Cheapest; insufficient for agent cost/latency SLOs |
| D — **Langfuse self-host only** | OSS on existing Postgres; OTel export bridge | Residency-friendly; ops burden on team |

**Recommendation:** **Option A** with **Option D** fallback when PDPL blocks Langfuse Cloud (CL-019). Instrument at Phase F minimum: API → orchestration → agents → reconciler (doc 10).

**Decision:** **Pending leadership** (A-GATE-002).

**Impact if unresolved:** Blocks F-OBS-001–002, SLO dashboards, MTTR targets, and production sign-off H-PROD-008. Incidents at 5k ws remain log-grep debugging.

**Cross-ref:** `analysis.md` (observability gap); doc 16 blocker #9.

---

## CL-010: Agency Hierarchy — `agencies` Table vs Extend `tenants`

**Area:** Multi-tenant productization (Module K)

**Ambiguity:** Migration 000011 implements Tenant → Workspace → Brand → Campaign. Audit doc 12 requires Agency layer for 500-agency billing/isolation. Unclear whether `tenants.type` enum can substitute for a dedicated table.

**Options:**

| Option | Description | Tradeoffs |
|--------|-------------|-----------|
| A — **New `agencies` table** (000014) | `agencies` + `brands.agency_id` + `workspaces.agency_id`; white-label JSONB | Clear billing isolation; migration + Sprint 17 UI |
| B — **Extend `tenants` with `type` enum** | `tenant_type`: platform, agency, end_customer | Minimal schema; conflates billing entities at 500 agencies |
| C — **Use 003 `parent_client_id` only** | No new tables; agency = parent workspace | Already exists; no agency-level billing roll-up or white-label |
| D — **Defer agencies to post-GA** | Keep 000011 hierarchy for v1 | Blocks 500-agency GTM and agency plan enforcement |

**Recommendation:** **Option A** — new `agencies` table per doc 12; non-destructive backfill (nullable FKs first).

**Decision:** **Pending leadership** (A-GATE-003).

**Impact if unresolved:** Blocks H-PROD-001, agency billing MV, white-label explainability, and C4 gap closure. Enterprise/agency sales require rework if wrong model chosen.

**Cross-ref:** CL-004 hierarchy backfill; gap C4; `data-model.md`.

---

## CL-011: Dify App Topology — One App vs Per-Agent Apps

**Area:** Agent mesh / Dify runtime (Module A, L6)

**Ambiguity:** CL-005 confirms Dify as runtime only. Unclear whether Brain + Creator (+ future agents) share one Dify app per workspace, one global app with variables, or one Dify app per agent type per workspace. Affects `ai_agent_configs`, key rotation, and `npm run ai:verify`.

**Options:**

| Option | Description | Tradeoffs |
|--------|-------------|-----------|
| A — **Per-agent-type apps** (platform templates) | Shared Brain app + shared Creator app; workspace keys in `ai_agent_configs` | Matches S13-T012 (two publishes); clear prompt isolation; 2 keys per workspace |
| B — **One app per workspace** | Single Dify app with router/intent | Fewer Dify apps at scale; prompt coupling; harder versioning |
| C — **One global platform app** | Env `DIFY_API_KEY` only | Simplest ops; weak tenant isolation; violates workspace override pattern |
| D — **OpenRouter-only** | Skip Dify for 004 agents | No S13-T012; loses RAG/tools in Dify; acceptable short-term per A-GATE-004 |

**Recommendation:** **Option A** — per-agent-type platform apps (Brain, Creator) with workspace API key override per CL-005. Prompts canonical in repo (`prompts/ai-cmo/`); Dify optional runtime.

**Decision:** **Resolved** (engineering default). Operator must publish both apps (S13-T012) unless leadership accepts Option D in writing.

**Impact if unresolved:** `ai:verify` fails; agents rely on OpenRouter fallback; RAG quality diverges from PRD.

**Cross-ref:** CL-005; R10; A-GATE-004.

---

## CL-012: Event Bus — Redis Streams vs Upstash Kafka (Long-Term)

**Area:** Event bus (Module Q)

**Ambiguity:** CL-001 chose Redis Streams for Sprint 12. Audit flags single-stream hot keys at 5k ws (M13) and lists Kafka as future transport. Unclear re-evaluation trigger and whether Kafka is on roadmap or permanently deferred.

**Options:**

| Option | Description | Tradeoffs |
|--------|-------------|-----------|
| A — **Redis Streams through GA** | Partition by `workspace_id` hash; dedicated Redis for marketing at scale | No new vendor; proven in repo; single-node limits ~10k events/hr |
| B — **Upstash Kafka at 1k ws gate** | Swap transport behind `MarketingEventBus` interface | Managed scaling; new infra cost + credentials |
| C — **Inngest events only** | Remove Redis bus; all triggers via Inngest | Simpler; loses ingress buffer if Inngest down |
| D — **Dual-write Redis + Kafka** | Migration period | Highest complexity; only if zero-downtime migration required |

**Recommendation:** **Option A** through 5k gate with stream sharding (Phase F). Re-evaluate **Option B** when `XINFO` lag p95 >60s for 7d or >10k events/hr sustained. Interface swap already documented in CL-001.

**Decision:** **Resolved** — Redis Streams v1; Kafka deferred behind measurable trigger.

**Impact if unresolved:** Low for Sprint 14–15; medium at 5k ws without sharding (M13).

**Cross-ref:** CL-001; gap M13, L5.

---

## CL-013: Memory Retrieval — pgvector vs Qdrant vs Hybrid

**Area:** Memory & learning (Module B)

**Ambiguity:** Tables live in Postgres; 003 RAG uses Qdrant for post analytics. `retrieveMemory` was empty (partial fix in Sprint 14 skeleton). Unclear single store vs hybrid for learnings retrieval.

**Options:**

| Option | Description | Tradeoffs |
|--------|-------------|-----------|
| A — **Postgres only** | SQL rank on `ai_cmo_learnings` (roi_impact, confidence) | Simple; no semantic match on objective text |
| B — **Qdrant only** | `workspace_{id}_learnings` collection | Semantic search; duplicates SoI already used for RAG |
| C — **Hybrid** (SQL filter + Qdrant rerank) | Top-N validated learnings in SQL → embedding merge | Best recall; two systems to keep consistent |
| D — **pgvector in Supabase** | Vectors in Postgres | Single DB; migration + index cost; overlaps Qdrant |

**Recommendation:** **Option C** — hybrid per doc 05: Postgres for validated/high-ROI rows, Qdrant for semantic objective match. Abstract `VectorStore` (L3).

**Decision:** **Resolved** (engineering default). C-MEM-005 optional Qdrant index Sprint 15.

**Impact if unresolved:** Blocks closed loop (C6), Optimizer quality, Brain context quality.

**Cross-ref:** gap C6, H1, H2; doc 05.

---

## CL-014: Approval Queue — Storage and UI Surface

**Area:** Governance (Module C)

**Ambiguity:** `routeToApproval` is callback-only; no `ai_cmo_approval_requests` table or SLA tracking. Unclear where operators approve and whether client approvers use same surface.

**Options:**

| Option | Description | Tradeoffs |
|--------|-------------|-----------|
| A — **Dedicated table + Settings inbox** | `ai_cmo_approval_requests`; `/settings/approvals` for operators | Clear SLA columns; fits E-GOV-001/008 |
| B — **Extend existing moderation queue** | Reuse inbox patterns from 003 | Less UI build; conflates social inbox with AI governance |
| C — **Email/Slack only** | Notifications without in-app queue | Fast MVP; no audit trail in product |
| D — **Client portal approver role** | Separate `/portal/approvals` for client approvers | Needed for agency model; more RBAC work |

**Recommendation:** **Option A** for Sprint 15 MVP; **Option D** in Phase H with agency UI. CRITICAL tier never auto-publishes (doc 06). Resume via Inngest webhook on approve (depends CL-008).

**Decision:** **Resolved** (engineering default). Implementation pending E-GOV-001.

**Impact if unresolved:** Blocks C8 gap, regulated-industry sales, approval SLA metrics.

**Cross-ref:** gap C8; doc 06; E-GOV-008.

---

## CL-015: Campaign → `post_id` → Publish Worker Wiring Contract

**Area:** Execution / reconciler (Module P, Feature 003 boundary)

**Ambiguity:** CL-003 maps campaigns to posts but `ai_cmo_campaigns.post_id` is never set in `campaign-service.ts`. Unclear handoff contract to 003 `publish-due-posts` worker.

**Options:**

| Option | Description | Tradeoffs |
|--------|-------------|-----------|
| A — **Reconciler creates `posts` row** | On LOW-risk + quality pass: reconciler inserts `posts` with schedule, sets `post_id`, enqueues 003 publish queue | Clean SoR/SoI; single write path; requires B-ORCH-007 |
| B — **Campaign API creates post directly** | Bypass reconciler for posts | Violates constitution; rejected |
| C — **Manual link** | Operator attaches post in UI | Pilot-only; not scalable |
| D — **Content piece only until explicit publish** | `ai_cmo_content_pieces` draft until user clicks Publish | More human steps; safer for Beta |

**Recommendation:** **Option A** — reconciler `syncToSoR` creates scheduled `posts` row via existing 003 schema; publish worker unchanged. Idempotency: `{workspaceId}/{campaignId}/publish`. Status flow: `campaign.approved → post.scheduled → post.published`.

**Contract (v1):**

1. Creator output → `ai_cmo_content_pieces` (draft)
2. Policy/quality pass → reconciler creates `posts` (status `scheduled`, content from piece)
3. Set `ai_cmo_campaigns.post_id` + `campaign.status = scheduled`
4. 003 worker picks up due posts — **no 003 worker changes**
5. Outcome job reads `post_analytics` by `post_id` → `ai_cmo_campaign_outcomes`

**Decision:** **Resolved** (contract defined). Implementation **open** (B-ORCH-007).

**Impact if unresolved:** SoR/SoI boundary incomplete; closed loop and attribution blocked (H4).

**Cross-ref:** CL-003, CL-006; gap H4; 003 README boundary.

---

## CL-016: FinOps — Block vs Warn on Budget Cap

**Area:** FinOps (Module E)

**Ambiguity:** `ai_cmo_budget_policies.action_on_cap` supports `block`, `require_approval`, `notify_only`. Defaults per plan tier not signed off. Stub `checkBudgetPolicy` graceful-fails if table missing.

**Options:**

| Option | Description | Tradeoffs |
|--------|-------------|-----------|
| A — **Hard block at 100%** (default) | Pre-flight step 0 fails workflow | Prevents runaway spend; may frustrate users mid-campaign |
| B — **Warn 80/95%, block 100%** | Threshold alerts + block | Industry standard (doc 09); requires notification channel |
| C — **require_approval at 100%** | FinOps approval queue | Safer UX; slower; needs CL-014 |
| D — **notify_only for enterprise** | Sales flexibility | Revenue-friendly; requires trust + manual monitoring |

**Recommendation:** **Option B** for free/professional/agency; **Option D** only for enterprise with signed contract. Free tier: block at 100% with no override. Agency: tenant-level roll-up cap (doc 09).

**Decision:** **Pending leadership** (Product + Finance). Engineering implements schema to support all actions.

**Impact if unresolved:** Blocks C3 gap closure; runaway token spend at scale (audit issue #40).

**Cross-ref:** gap C3; doc 09; D-FIN-003.

---

## CL-017: SEO / Programmatic Pages — In-App vs Separate Service

**Area:** Content quality / SEO (Module D, doc 11)

**Ambiguity:** PRD mentions programmatic SEO at scale; doc 11 scopes social + future blog/Activepieces. Unclear whether Nexus hosts landing/programmatic pages or only social captions.

**Options:**

| Option | Description | Tradeoffs |
|--------|-------------|-----------|
| A — **In-app (Next.js routes)** | Programmatic pages in `nexus-social-app` | Unified auth/billing; SEO infra competes with app core |
| B — **Separate microservice** | Edge-rendered page generator + API | Isolation; extra deploy and sync |
| C — **Activepieces / external CMS** | Flow publishes to Webflow/WordPress | Matches 003 integration pattern; not core 004 |
| D — **Social-only v1; SEO deferred** | EEAT/cannibalization gates on captions only | Focused scope; PRD metric "programmatic SEO" deferred |

**Recommendation:** **Option D** for v1 launch gate. **Option C** for long-form when Module J Knowledge Hub matures. In-app programmatic pages (**Option A**) not before Phase H+ unless product prioritizes.

**Decision:** **Deferred** (post-GA roadmap).

**Impact if unresolved:** Low for 5k social-first gate; medium if GTM promises programmatic SEO landing pages.

**Cross-ref:** doc 11; Module J deferred Sprint 15.

---

## CL-018: Multi-Region / DR Scope for v1 Launch

**Area:** Infrastructure / DR (Module M, doc 13)

**Ambiguity:** Doc 13 defines Tier 1 RPO 15min/RTO 1h and future multi-region (UAE/EU/US). Unclear what v1 launch must prove vs enterprise future.

**Options:**

| Option | Description | Tradeoffs |
|--------|-------------|-----------|
| A — **Single-region v1** | Supabase PITR + Redis HA plan + runbooks | Honest for Beta/GA; meets most SMB agencies |
| B — **Active-active multi-region v1** | `tenants.data_region` routing live | PDPL-ready; 3× infra cost |
| C — **Read replica only** | EU/UAE read paths | Partial residency story; write still single region |
| D — **Pilot: DR tabletop only** | Documented runbooks; no HA hardware | Fast; fails 99.9% claim under real failure |

**Recommendation:** **Option A** for v1 with **H-PROD-006** DR tabletop + Redis HA funded before 5k gate. Multi-region active (**Option B**) tied to CL-019 enterprise tier, not v1 launch.

**Decision:** **Resolved** — single-region v1; multi-region enterprise Phase H+.

**Impact if unresolved:** Over-engineering if B chosen early; under-engineering if D chosen for 5k claim.

**Cross-ref:** doc 13, 16; H-PROD-006.

---

## CL-019: PDPL / GDPR Data Residency for MENA Tenants

**Area:** Compliance (Module I)

**Ambiguity:** No `tenants.data_region` column. Memory tables store JSONB context without PII scrubbing. Unclear inference routing (Dify Cloud, OpenRouter, Langfuse) for UAE/EU tenants.

**Options:**

| Option | Description | Tradeoffs |
|--------|-------------|-----------|
| A — **Region flag + routing** | `tenants.data_region`; EU/MENA/US model endpoints; scrub before memory persist | Full compliance path; requires provider matrix |
| B — **Contractual EU/US only v1** | No MENA data residency claim until B ready | Faster launch; limits MENA enterprise deals |
| C — **Self-host stack in-region** | Dify + Langfuse + Qdrant in UAE/EU | Strong residency; high ops |
| D — **Anonymize-only** | PII scrub + no residency routing | Partial; may fail PDPL lawful-basis audits |

**Recommendation:** **Option A** for enterprise/MENA tier; **Option B** for standard cloud tier until Phase H. Mandatory `scrubPii()` before learnings persist (E-GOV, H13). Security sign-off: A-GATE-005.

**Decision:** **Pending leadership** (Legal + Security).

**Impact if unresolved:** Blocks MENA GTM, memory layer production, Langfuse Cloud choice (CL-009).

**Cross-ref:** A-GATE-005; gap H11, H13, M10; doc 06.

---

## CL-020: Meta App Review vs Manual Token Seed for Agencies

**Area:** Integrations boundary (Feature 003)

**Ambiguity:** T057 gates Facebook/Instagram production on Meta App Review. Unclear whether agencies onboard with OAuth (App Review) or operator-seeded long-lived tokens for pilot/bulk agency setup.

**Options:**

| Option | Description | Tradeoffs |
|--------|-------------|-----------|
| A — **App Review only (production)** | Standard OAuth per workspace; `meta_app_review_approved` flag | Compliant; blocks until Meta approves |
| B — **Manual token seed (pilot)** | Operator inserts tokens for demo agencies | Fast pilot; violates scale; token rotation burden |
| C — **Hybrid** | App Review for GA; manual seed for ≤10 pilot workspaces with written waiver | Practical; must not leak to production marketing |
| D — **LinkedIn/X only until Meta approved** | De-scope Meta for v1 | Reduces channel coverage |

**Recommendation:** **Option C** for current pilot (aligns with doc 16 manual oversight). **Option A** mandatory before external GA and any "production autonomous" claim. 004 campaign→post path (CL-015) must respect 003 publish gates.

**Decision:** **Pending leadership** (Business + Operator). Engineering gate (T057) already implemented.

**Impact if unresolved:** Blocks Track 1 launch (T053–T057); 004 publish loop untested on Meta live.

**Cross-ref:** Feature 003 README; IMPLEMENT_PLAN Track 1; R10 adjacent.

---

## CL-021: AI-to-Human Approval Ratio Targets (70/30 vs 90/10)

**Area:** Governance / product metrics

**Ambiguity:** PRD implies autonomous engine; doc 16 mandates human-in-the-loop for pilot. No signed target for auto-publish vs approval rate. Phase E cites Judge–human agreement >85%, not autonomy ratio.

**Options:**

| Option | Description | Tradeoffs |
|--------|-------------|-----------|
| A — **90/10 auto/human** | Aggressive autonomy; LOW tier only auto-publishes | High velocity; compliance risk if policy immature |
| B — **70/30 auto/human** | Balanced; MED+ to approval | Safer for MENA/regulated; slower time-to-campaign |
| C — **Tier-based, no global ratio** | Auto only LOW+quality; MED+ always human | Matches doc 06 risk model; harder to market "90% autonomous" |
| D — **Pilot 100% human** → relax by phase | All campaigns approved until Phase E sign-off | Safest; honest for current runtime (~35%) |

**Recommendation:** **Option C** as architecture default (risk-tier governs, not a single ratio). **Option D** until Phase E complete. Marketing may cite **Option B** as Year-1 **target** once Judge–human agreement >85% for 30d — not before.

**Decision:** **Pending leadership** (Product + Compliance).

**Impact if unresolved:** Misaligned GTM claims; wrong approval queue sizing; FinOps/cost models assume wrong automation level.

**Cross-ref:** doc 06, 07, 16; Phase E success metrics.

---

## CL-022: "Production Ready for 5,000 Workspaces" — Gate Criteria

**Area:** Launch / production readiness

**Ambiguity:** PRD v3 claims 9.7/10 design maturity; audit scores runtime ~3.5/10 and scale ~2/10. No single checklist defines the 5k gate vs pilot/Beta/GA.

**Options:**

| Option | Description | Tradeoffs |
|--------|-------------|-----------|
| A — **Audit doc 16 checklists** | Pre-build LD-1–4 + Pre-production Phase B–H + 7-day soak at 500 ws | Comprehensive; ~20 weeks |
| B — **Reduced "GA-lite" (1k ws)** | Phases A–F only; agencies deferred | Faster; misaligned with 5k marketing |
| C — **Feature checklist only** | `LAUNCH_CHECKLIST.md` 100% | Ignores scale/observability |
| D — **Load test pass only** | H-PROD-007 as sole gate | Necessary not sufficient |

**Recommendation:** **Option A** — adopt doc 16 verbatim as gate. Minimum measurable criteria:

| Gate | Criteria |
|------|----------|
| **Pilot (now)** | 10 ws; manual approval; doc 16 "What Works Today" |
| **Beta (100 ws)** | Phase B+E partial; async campaigns; approval queue; Inngest or documented Redis fallback |
| **GA (1k ws)** | Phases B–F complete; FinOps block; OTel+Langfuse; circuit breakers |
| **Scale (5k ws)** | Phase H complete; agencies 000014; load test 500 concurrent ws; Redis HA; 7-day soak 10% scale; sign-off template doc 16 |

**Decision:** **Resolved** — doc 16 is authoritative gate; do not market 5k-ready until H-PROD-008 sign-off.

**Impact if unresolved:** Premature scale marketing; undefined engineering done-ness.

**Cross-ref:** doc 16; IMPLEMENT_PLAN executive summary; H-PROD-007/008.

---

## Open Questions for Leadership

Items that **cannot** be resolved without business, legal, or operator input (max 10):

1. **A-GATE-001 / CL-008:** Approve Inngest (Cloud vs self-host) or formally accept time-boxed Redis-only Beta with sunset date?
2. **A-GATE-002 / CL-009:** Approve Langfuse (Cloud vs self-host) or mandate OTel-only build?
3. **A-GATE-003 / CL-010:** Approve `agencies` migration 000014 for 500-agency GTM?
4. **CL-016:** Default FinOps behavior at 100% cap — hard block, approval queue, or notify-only by plan tier?
5. **CL-019 / A-GATE-005:** MENA PDPL scope — EU/US-only v1 or in-region routing commitment for enterprise?
6. **CL-020:** Meta pilot — manual token waiver for ≤10 workspaces vs hard App Review gate for all?
7. **CL-021:** Marketing autonomy claim — adopt tier-based routing (recommended) or set explicit 70/30 vs 90/10 target?
8. **A-GATE-004 / CL-011:** Accept OpenRouter-only mode if Dify publish slips, or hold Beta until S13-T012 complete?
9. **Budget ownership:** Who sets agency-level caps — platform ops, agency admin, or automated plan defaults?
10. **5k launch claim:** Sign doc 16 "NOT READY" acknowledgment before external sales at scale, or redefine target to 1k GA-lite (CL-022)?

---

## Document History

| Date | Change |
|------|--------|
| 2026-06-24 | CL-001–CL-007 Sprint 12–13 decisions |
| 2026-06-23 | Architecture audit pack ingested |
| 2026-06-24 | CL-008–CL-022 + Open Questions (speckit.clarify pass) |

