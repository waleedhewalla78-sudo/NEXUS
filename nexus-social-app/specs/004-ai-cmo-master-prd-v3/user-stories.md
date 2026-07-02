# User Stories — Feature 004 AI CMO

> **⚠️ SUPERSEDED:** Authoritative Enterprise GA spec is `specs/004-ai-cmo-enterprise/` (T001–T058 complete). This v3 PRD is historical reference only.

**Feature:** 004 AI CMO Master PRD v3.0  
**Date:** 2026-06-24  
**Parent spec:** [spec.md](./spec.md)  
**Format:** As a [persona], I want [goal], so that [benefit]

---

## Personas

| Persona | Description |
|---------|-------------|
| **Agency owner** | Runs a multi-client marketing agency; cares about margins, white-label, billing isolation, portfolio ROI |
| **Marketing operator** | Day-to-day campaign execution; cares about speed, publish reliability, channel performance |
| **Executive / CIO** | Board-level oversight; cares about governance, cost control, compliance, uptime SLOs |
| **Client approver** | End-customer brand manager; approves content before publish; limited Nexus access |
| **AI ops engineer** | Platform SRE / MLOps; cares about traces, DLQ, circuit breakers, FinOps ledgers |

---

## P1 — Core campaign loop

### US-001 — AI campaign creation (Marketing operator)

As a **marketing operator**, I want to submit a campaign brief and receive an AI-generated strategy plus draft content in under 15 minutes, so that I can move from idea to schedulable assets without manual copywriting.

**Priority:** P1 · **FRs:** FR-001, FR-024, FR-025, FR-016  
**Phase:** Sprint 13 (partial) · **Status:** **Implemented** (sync + async 202 path; Brain/Creator agents)

**Independent test:** POST campaign with brief → receive strategy JSON, content pieces, confidence score, persona explainability.

**Acceptance scenarios:**

1. **Given** a connected workspace with brand context, **When** the operator submits a campaign brief, **Then** Strategic Brain returns horizon, channels, and KPI targets within p95 &lt; 30 s per agent step.
2. **Given** an approved strategy, **When** Creator runs, **Then** caption, hashtags, and platform variants are stored via reconciler (no direct agent DB writes).
3. **Given** async orchestration enabled, **When** POST returns 202, **Then** poll URL resolves to `completed` or `failed` with explainability payload.

---

### US-002 — Risk-based governance gate (Executive / CIO)

As an **executive**, I want high-risk content blocked by policy regardless of model confidence, so that regulated industries never auto-publish non-compliant messaging.

**Priority:** P1 · **FRs:** FR-016, FR-017, FR-018  
**Phase:** Sprint 12–13 · **Status:** **Partial** (policy engine + 6 rules; no approval queue UI)

**Independent test:** Inject plan JSON with prohibited terms → workflow routes to approval path; CRITICAL tier never auto-publishes.

**Acceptance scenarios:**

1. **Given** content classified CRITICAL risk, **When** workflow completes policy step, **Then** auto-publish is blocked even if quality score &gt; 0.85.
2. **Given** MENA PDPL-sensitive PII in draft, **When** policy runs, **Then** violation is logged in audit trail via reconciler.

---

### US-003 — Publish closed loop (Marketing operator)

As a **marketing operator**, I want AI-generated campaigns linked to real scheduled posts and published via Feature 003 workers, so that clients see live content—not dashboard-only drafts.

**Priority:** P1 · **FRs:** FR-007, FR-001 (003 dependency)  
**Phase:** Sprint 14 · **Status:** **Not built** (`post_id` FK never set; B-ORCH-007 open)

**Independent test:** Campaign → reconciler creates post → 003 publish worker → external network ID recorded.

**Acceptance scenarios:**

1. **Given** approved campaign content, **When** operator schedules publish, **Then** `ai_cmo_campaigns.post_id` references a `posts` row in 003 SoR.
2. **Given** publish succeeds on LinkedIn, **When** operator views campaign detail, **Then** per-platform status mirrors 003 publish state.

**003 link:** [003 spec — User Story 2 Real Scheduled Publishing](../003-real-integrations-production/spec.md)

---

### US-004 — Client content approval (Client approver)

As a **client approver**, I want a simple approval inbox for AI drafts assigned to my brand, so that nothing publishes without my explicit sign-off.

**Priority:** P1 · **FRs:** FR-019, FR-020  
**Phase:** Phase E · **Status:** **Not built**

**Independent test:** Campaign routed to approval → approver accepts/rejects → status transitions only via reconciler.

**Acceptance scenarios:**

1. **Given** a draft awaiting approval, **When** approver rejects with reason, **Then** campaign status is `rejected` and Creator replan is optional.
2. **Given** SLA expiry on approval request, **When** deadline passes, **Then** operator receives alert; content does not auto-publish.

---

## P2 — Learning, ROI, and operations

### US-005 — Closed-loop learning (Marketing operator)

As a **marketing operator**, I want the AI to learn from published campaign outcomes, so that future strategies improve based on what actually performed.

**Priority:** P2 · **FRs:** FR-009, FR-010, FR-011, FR-028  
**Phase:** Phase C · **Status:** **Partial** (MemoryRepository + Optimizer skeleton; no outcome ingestion job)

**Independent test:** Publish campaign → analytics sync → outcome row → Optimizer writes learning → Brain retrieval includes learning.

**Acceptance scenarios:**

1. **Given** published post with analytics after 48 h, **When** outcome job runs, **Then** `ai_cmo_campaign_outcomes` is populated for ≥80% of active campaigns.
2. **Given** completed campaign with outcome, **When** Optimizer runs, **Then** ≥1 validated learning row exists in `ai_cmo_learnings`.

---

### US-006 — Campaign ROI and attribution (Agency owner)

As an **agency owner**, I want campaign-level ROI with attribution events tied to UTM and conversions, so that I can report client performance with auditable numbers.

**Priority:** P2 · **FRs:** FR-032, FR-033, FR-034  
**Phase:** Phase D · **Status:** **Partial** (schema + MVs; ingestion + refresh cron not built)

**Independent test:** Attribution webhook → event row → refreshed MV → dashboard shows cost-per-lead.

**Acceptance scenarios:**

1. **Given** UTM-tagged landing page conversion, **When** webhook fires, **Then** `ai_cmo_attribution_events` links to campaign and channel.
2. **Given** hourly MV refresh cron, **When** operator opens FinOps view, **Then** cost summary is &lt; 1 h stale.

---

### US-007 — AI spend controls (Executive / CIO)

As a **CIO**, I want pre-flight budget caps per workspace before any agent workflow starts, so that runaway token spend cannot occur across 5,000 workspaces.

**Priority:** P2 · **FRs:** FR-035, FR-036, FR-037  
**Phase:** Phase D · **Status:** **Partial** (`recordAgentCost` + `checkBudgetPolicy` stub; migration 000013 not applied)

**Independent test:** Set workspace cap below estimated run cost → POST campaign returns budget error at step 0.

**Acceptance scenarios:**

1. **Given** workspace over monthly AI budget, **When** orchestration starts, **Then** workflow aborts before agent calls with actionable error.
2. **Given** every Brain/Creator call, **When** agent completes, **Then** token count is logged to `ai_cmo_cost_ledger`.

---

### US-008 — Executive explainability (Executive / CIO)

As an **executive**, I want confidence scores and rationale in board-ready language, so that I can defend AI decisions to stakeholders without reading operator jargon.

**Priority:** P2 · **FRs:** FR-021, FR-022  
**Phase:** Sprint 13 · **Status:** **Implemented** (renderer + API; persistence partial via workflow deps)

**Independent test:** Same campaign payload → executive persona returns summary band + top risks; operator persona returns tactical detail.

**Acceptance scenarios:**

1. **Given** calibrated confidence API response, **When** persona is `executive`, **Then** output emphasizes band and business impact—not token counts.
2. **Given** workflow completion, **When** evaluation is persisted, **Then** confidence band is auditable in `ai_cmo_evaluations`.

---

### US-009 — Event-driven replanning (Marketing operator)

As a **marketing operator**, I want underperforming campaigns automatically flagged and replanned when metrics breach thresholds, so that I do not manually monitor every live campaign.

**Priority:** P2 · **FRs:** FR-004, FR-005, FR-006  
**Phase:** Sprint 14 partial · **Status:** **Partial** (consumers + Redis DLQ; Inngest bridge not built)

**Independent test:** Publish `campaign.underperforming` event → consumer triggers replan callback → new strategy draft queued.

**Acceptance scenarios:**

1. **Given** campaign below KPI threshold for 24 h, **When** event bus receives signal, **Then** replan job is enqueued within one worker cycle.
2. **Given** budget threshold breach, **When** event fires, **Then** Finance policy path is invoked before further spend.

---

### US-010 — AI operations observability (AI ops engineer)

As an **AI ops engineer**, I want LLM traces, agent error rates, and DLQ visibility in one dashboard, so that I can debug failures and meet 99.9% uptime SLOs.

**Priority:** P2 · **FRs:** FR-039, FR-040, FR-041, FR-042  
**Phase:** Phase F · **Status:** **Not built**

**Independent test:** Failed agent step → appears in Langfuse trace + DLQ table + Sentry alert.

**Acceptance scenarios:**

1. **Given** Dify timeout, **When** circuit breaker opens, **Then** fallback provider is used and incident is traced without cascading failure.
2. **Given** 3 failed orchestration retries, **When** DLQ handler runs, **Then** row exists in failed-jobs store with workspace context.

---

## P3 — Agency productization and scale

### US-011 — Multi-client hierarchy (Agency owner)

As an **agency owner**, I want tenants, agencies, client brands, and workspaces organized in a billing hierarchy, so that I can isolate 500 agencies and thousands of client brands.

**Priority:** P3 · **FRs:** FR-048, FR-049, FR-050  
**Phase:** Phase H · **Status:** **Partial** (000011 tenants/brands; agencies 000014 not applied)

**Independent test:** Agency admin sees only their client brands; RLS blocks cross-agency reads.

**Acceptance scenarios:**

1. **Given** agency with 10 client brands, **When** owner views portfolio, **Then** roll-up metrics aggregate only their brands.
2. **Given** migration 000014 applied, **When** brand is created, **Then** optional `agency_id` links to reseller entity.

---

### US-012 — White-label AI outputs (Agency owner)

As an **agency owner**, I want AI explainability and exports to use my client's brand name and voice—not Nexus defaults—so that client-facing deliverables match our white-label promise.

**Priority:** P3 · **FRs:** FR-051  
**Phase:** Phase H · **Status:** **Not built**

**Independent test:** Brand with `brand_voice_config` → Creator output and explainability use client name.

**Acceptance scenarios:**

1. **Given** white-label config on agency, **When** operator exports explainability PDF, **Then** no "Nexus Social" hardcoded strings appear.

---

### US-013 — Agency billing and credits (Agency owner)

As an **agency owner**, I want unified AI credit and token cost reporting across 003 billing and 004 FinOps ledgers, so that I can invoice clients accurately.

**Priority:** P3 · **FRs:** FR-037, FR-038  
**Phase:** Phase D · **Status:** **Not built** (unified MV not created)

**Independent test:** Single report joins `ai_credit_ledger` and `ai_cmo_cost_ledger` per workspace/month.

---

### US-014 — Portfolio S&OP (Executive / CIO)

As an **executive**, I want cross-brand budget scenarios and tradeoff recommendations, so that I can allocate spend across a portfolio—not per campaign in isolation.

**Priority:** P3 · **FRs:** FR-030, FR-031  
**Phase:** Phase G · **Status:** **Not built**

**Independent test:** Executive API returns scenario comparing +20% spend on Brand A vs Brand B with projected ROI.

---

### US-015 — MENA compliance automation (Executive / CIO)

As a **CIO** operating in UAE and Egypt, I want automated PDPL/DPL checks and data-residency routing, so that we meet regional compliance without manual legal review on every post.

**Priority:** P3 · **FRs:** FR-018, FR-023, NFR-008, NFR-009  
**Phase:** Phase E · **Status:** **Partial** (baseline policy rules only)

**Independent test:** Tenant with `data_region=UAE` → inference routes to approved endpoint; PDPL PII blocked in learnings.

---

### US-016 — Programmatic SEO at scale (Marketing operator)

As a **marketing operator**, I want AI-generated landing pages and meta content that pass EEAT and cannibalization gates before publish, so that we can scale SEO without search penalties.

**Priority:** P3 · **FRs:** FR-045, FR-046, FR-047  
**Phase:** Post-Sprint 15 · **Status:** **Not built**

**Independent test:** 100 page batch → quality engine blocks duplicate topics and low EEAT scores.

---

### US-017 — Disaster recovery readiness (AI ops engineer)

As an **AI ops engineer**, I want documented RTO/RPO, Redis HA, and reconciler replay procedures, so that we can recover from regional outage without silent data loss.

**Priority:** P3 · **FRs:** FR-053, FR-054, FR-055  
**Phase:** Phase F + H · **Status:** **Not built**

**Independent test:** Tabletop exercise completes with reconciler replay from audit log.

---

## P3 — External intelligence (deferred)

### US-018 — Competitor and trend radar (Marketing operator)

As a **marketing operator**, I want AI Radar to surface competitor moves and trending topics into campaign planning, so that strategies react to market shifts—not static briefs.

**Priority:** P3 · **FRs:** FR-026  
**Phase:** Phase G · **Status:** **Not built** (003 listening partial)

---

### US-019 — Channel risk heatmap (Marketing operator)

As a **marketing operator**, I want channel risk scores before committing budget to a platform, so that CPM volatility and policy changes do not surprise my clients.

**Priority:** P3 · **FRs:** FR-027  
**Phase:** Phase G · **Status:** **Not built**

---

### US-020 — LLM-as-Judge quality regression (AI ops engineer)

As an **AI ops engineer**, I want automated quality evaluation on every Creator output, so that model or prompt regressions are caught before clients see drafts.

**Priority:** P2 · **FRs:** FR-020, FR-021  
**Phase:** Phase E · **Status:** **Not built** (schema only)

**Independent test:** Creator output → Judge job → `ai_cmo_evaluations` row with ≥8 dimensions.

---

## Edge cases

- **Cold-start workspace:** No learnings or analytics → Brain uses default strategy templates; Optimizer skips until first outcome.
- **Dify unavailable:** OpenRouter fallback runs with workspace model policy (not yet enforced—see FR-024).
- **Meta App Review pending:** 003 publish blocked for Meta/IG; AI CMO must surface 003 connection state in campaign UI (US-003).
- **Concurrent campaigns:** Async 202 + worker/Inngest must not double-charge budget caps.
- **Service-role reconciler compromise:** Per-workspace rate limits required before scale (FR-043).

---

## Story index by persona

| Persona | Stories |
|---------|---------|
| Agency owner | US-006, US-011, US-012, US-013, US-014 |
| Marketing operator | US-001, US-003, US-005, US-009, US-016, US-018, US-019 |
| Executive / CIO | US-002, US-007, US-008, US-014, US-015 |
| Client approver | US-004 |
| AI ops engineer | US-010, US-017, US-020 |
