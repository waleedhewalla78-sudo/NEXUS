# Nexus Social Platform — Master Product Requirements Document (PRD)

**Document ID:** NEXUS-PRD-001  
**Version:** 2.1.0  
**Status:** Authoritative — reflects **as-built development state** as of 2026-07-03 (committed `72f7b91` on `main`)  
**Repository:** `nexus-social-app` (monorepo: `nexus-social-platform`) · **GitHub:** `waleedhewalla78-sudo/NEXUS`  
**Canonical engineering constitution:** [`CONSTITUTION.md`](../CONSTITUTION.md) v1.3.0  
**Audience:** Executive leadership · Product · Engineering · RevOps · Compliance · DevOps  
**Session report:** [Appendix I — Track 1 Operations Report (2026-07-03)](#appendix-i--track-1-operations-report-2026-07-03)

---

## Table of Contents

1. [Product Vision & Scope](#1-product-vision--scope)
2. [Problem Statement & Business Context](#2-problem-statement--business-context)
3. [Goals & Success Metrics](#3-goals--success-metrics)
4. [User Personas & Workflows](#4-user-personas--workflows)
5. [Use Cases](#5-use-cases)
6. [Functional Requirements](#6-functional-requirements)
7. [Feature Specifications](#7-feature-specifications)
8. [Business Scenarios](#8-business-scenarios)
9. [User Interface & Navigation](#9-user-interface--navigation)
10. [Authorization, Roles & Permissions](#10-authorization-roles--permissions)
11. [Reports & Dashboards](#11-reports--dashboards)
12. [Integration Requirements](#12-integration-requirements)
13. [Technical Architecture](#13-technical-architecture)
14. [Competitive Context](#14-competitive-context)
15. [Data & Privacy](#15-data--privacy)
16. [Implementation Roadmap](#16-implementation-roadmap)
17. [Risks & Mitigation](#17-risks--mitigation)
18. [Assumptions & Constraints](#18-assumptions--constraints)
19. [Appendices](#19-appendices)
20. [Appendix I — Track 1 Operations Report (2026-07-03)](#appendix-i--track-1-operations-report-2026-07-03)

---

## Document Control

| Field | Value |
|-------|-------|
| **Last verified gates** | `typecheck` PASS · **239** unit tests PASS · `uat:check-schema` 13/13 · `verify:abm-seed` PASS · Postman A/B PASS · live integration 5/5 · `verify:production:code` PASS |
| **GitHub** | `main` @ `72f7b91` (73 files, Sprint 18–19 + ops + S15–S17 partial) |
| **Production verdict** | **Enterprise pilot / staging-ready** — production go-live **blocked** on Section B human gates (Meta, OAuth UAT, exec sign-off, prod secrets) |
| **VPS deploy (Hostinger)** | **Paused** — ops docs ready; Track 2 Hermes SSH deferred (DEC-006) |
| **Known doc drift** | GitHub issues #7–#19 open but Sprint 18–19 shipped — close via `scripts/close-sprint-18-19-issues.sh` (#14 stays open) |

### Stakeholder decisions required (flagged, not assumed)

| ID | Decision | Owner | Blocks |
|----|----------|-------|--------|
| **DEC-001** | Langfuse self-host vs Cloud | CIO | Full AI observability panels (A-GATE-002) |
| **DEC-002** | Agency hierarchy production apply | Product + Eng | Sprint 20 agency command center (A-GATE-003) |
| **DEC-003** | HubSpot Private App token vs full OAuth | RevOps | Live CRM sync in customer env |
| **DEC-004** | PDPL security sign-off on memory/FinOps flows | Security | Enterprise MENA contracts (A-GATE-005) |
| **DEC-005** | Production Supabase project + cutover date | DevOps | Production deploy |
| **DEC-006** | Hermes AI SSH deploy vs GitHub Actions CD | DevOps | Track 2 VPS base setup — **PAUSED** |

---

## 1. Product Vision & Scope

### 1.1 Vision

**Nexus Social** is an enterprise-grade, AI-native **omnichannel social media management platform** with an embedded **Nexus Social AI CMO** layer — an eight-agent governed campaign factory that connects social execution, ABM intent, CRM closed-won proof, and regional compliance into one auditable revenue loop.

**Positioning statement:** For enterprise marketing and RevOps teams in MENA and global regulated industries, Nexus Social is the only platform that combines **real social publish integrations**, **governed multi-agent AI campaigns**, and **CRM-attributed revenue proof** — not generic AI copywriting disconnected from pipeline outcomes.

### 1.2 In scope (current product)

| Track | Name | Scope summary | Dev status |
|-------|------|---------------|------------|
| **003** | Real Integrations Production | OAuth, encrypted tokens, publish (FB/IG/LinkedIn/X), worker, analytics, listening, Chatwoot, webhooks, billing hooks | **Code complete** |
| **004** | AI CMO Enterprise | Inngest orchestration, 8-agent mesh, policy engine, approvals, FinOps, memory (PG+Qdrant), brief wizard, intelligence dashboard | **58/58 Speckit tasks complete** |
| **005a** | Product Intelligence (Phase 7) | Campaign brief API/UI, paid media import, calendar export | **Shipped** |
| **005b** | Enterprise Revenue Loop | ABM activation, control plane, HubSpot/SFDC webhooks, MENA compliance pack, executive exports | **Sprint 18–19 shipped** |

### 1.3 Explicitly out of scope (today)

| Item | Reason |
|------|--------|
| TikTok / Snapchat **live** publish | Enum + graceful skip only (FR-P01) |
| Replacing 003 publish path with 004-only flow | Constitution zero-regression rule |
| Dify as workflow orchestrator | CL-005 — Dify is runtime only |
| Agent/Dify direct SoR writes | Reconciler-only writes (constitution) |
| Agency command center (full) | Blocked A-GATE-003 until migration `000014` applied in prod |
| Pentest execution | S17 backlog (FR-P04) |
| Meta live publish without App Review | Code gate: `meta_app_review_status = approved` |
| Standalone artifact apps in monorepo | Program spec out-of-scope |

### 1.4 Scope evolution by version

| Version / phase | Added | Removed / deferred | Reason |
|-----------------|-------|-------------------|--------|
| **003 (Sprints 1–11)** | Production OAuth, publish worker, analytics | — | Baseline SoR for social truth |
| **004 (Sprint 12+)** | AI CMO hierarchy, campaigns, agents, FinOps | Sync campaign API (replaced by 202+poll) | Scale + governance |
| **004 Sprint 14+** | Inngest (A-GATE-001 shipped), Redis bridge | Parallel BRPOP-only path (deprecated path documented) | Durable orchestration |
| **005 Phase 7a/b** | Brief wizard, intelligence UI | — | Executive + paid media workflows |
| **005 Sprint 18** | ABM activation, control plane | Static ABM mocks in production UI | Enterprise demo credibility |
| **005 Sprint 19** | CRM webhooks, MENA profile, attribution export | Full HubSpot OAuth (stub only) | Faster webhook-first CRM path |
| **005 Sprint 20** | — (planned) | Agency UI until gate | A-GATE-003 |

---

## 2. Problem Statement & Business Context

### 2.1 Problems solved

| Problem | Who feels it | Nexus solution |
|---------|--------------|----------------|
| Social teams use schedulers that don't prove revenue impact | CMO, RevOps | Attribution reports + CRM mirror + executive export |
| AI content tools lack governance and audit trails | Legal, Compliance | Policy Engine V2, risk tiers, approval queue, signed audit PDF |
| ABM platforms show intent but don't trigger governed campaigns | ABM operators | One-click playbook → existing campaign workflow + `abm_playbook_runs` audit |
| MENA enterprises need certifiable compliance, not hidden rules | Compliance officers | Toggleable `mena_v1` profile → Compliance agent + PDF attestation |
| Agencies can't isolate client FinOps and approvals | Agency principals | **Planned** Sprint 20 (blocked on 000014) |
| Operators can't see AI spend and failures in one place | AI ops lead | Agent Control Plane (`/ai-cmo/control-plane`) |

### 2.2 User pain points (validated in specs + UAT design)

1. **Publish truth gap** — Scheduled posts must reach real APIs; Meta blocked until business approval.
2. **AI black box** — Executives require explainability panels and confidence bands that do **not** override policy blocks.
3. **CRM disconnect** — Closed-won in HubSpot/Salesforce doesn't automatically credit social/AI touches without webhook config.
4. **Budget overrun** — AI spend must hard-stop at workspace caps (Postman Test B validates).
5. **Multi-tenant leakage fear** — RLS on every tenant table is non-negotiable.

### 2.3 Market opportunity

- **Primary:** Enterprise B2B marketing in **MENA** (telco, banking, retail) adopting AI-assisted content under PDPL/DPL scrutiny.
- **Secondary:** Global agencies managing multi-brand social + AI campaigns with FinOps visibility.
- **TAM proxy:** ABM + social + AI ops convergence — buyers evaluating Hootsuite/Sprout + Jasper/Copy.ai + HubSpot separately; Nexus consolidates execution + governance + attribution.

### 2.4 Competitive positioning (summary — detail in §14)

Nexus differentiates on **governed agent mesh + reconciler SoR + CRM closed-loop** rather than template generation alone. It **does not** yet match incumbents on channel breadth (TikTok/Snapchat live) or native CRM OAuth depth (HubSpot OAuth stub).

---

## 3. Goals & Success Metrics

### 3.1 Platform-level KPIs

| KPI | Target | Current measurement | Status |
|-----|--------|---------------------|--------|
| Unit test regression | 0 failures on main | **239** passed / 1 skipped | **PASS** |
| Schema UAT | 13/13 tables OK | `npm run uat:check-schema` | **PASS** |
| Live integration closed loop | 5/5 | `npm run test:live-integration` | **PASS** |
| Postman campaign A (202→published) | PASS | `npm run uat:postman-ab` | **PASS** |
| Postman budget block B | FAIL fast with budget message | Automated 2026-06-30 | **PASS** |
| ABM activation latency | p95 < 30s (excl. LLM) | `verify:abm-seed` activate 202 | **PASS (demo)** |
| CRM mirror linkage | ≥80% closed-won mirrored | **Requires live HubSpot/SFDC config** | **OPEN (operator)** |
| Production OAuth UAT | T053–T056 pass | `npm run uat:t053` | **OPEN (operator)** |
| Meta live publish | App Review approved | `workspaces.meta_app_review_status` | **OPEN (business)** |

### 3.2 Feature-track acceptance criteria

| Track | Exit criteria |
|-------|---------------|
| **003 pilot** | OAuth connect → schedule → worker publish → analytics reflect published post |
| **004 demo** | Brief/campaign API → 202 → poll completed → content in SoR → policy evaluated |
| **005 enterprise demo** | ABM account → activate playbook → control plane shows agents → attribution export includes CRM totals |
| **Production** | Section B gates in `docs/PRE-DEPLOYMENT-CHECKLIST.md` all checked |

---

## 4. User Personas & Workflows

### 4.1 Personas

| Persona | Role | Goals | Pain points | Primary surfaces |
|---------|------|-------|-------------|------------------|
| **Social Operator** | Manages calendar & publish | Schedule posts, monitor failures | OAuth complexity, Meta gates | `/calendar`, `/posts/create`, `/settings` |
| **AI CMO Operator** | Runs AI campaigns | Brief → campaign → approvals | Black-box AI, budget caps | `/ai-cmo/campaigns/new`, `/ai-cmo/approvals` |
| **ABM Operator** | Target account motion | Activate playbooks on high-intent accounts | Intent data without action | `/ai-cmo/abm` |
| **AI Ops Lead** | Fleet reliability | Monitor agents, spend, failures | Fragmented logs | `/ai-ops`, `/ai-cmo/control-plane` |
| **RevOps / CFO** | Revenue proof | Attribute social/AI to pipeline | Board asks for CRM linkage | `/ai-cmo/attribution`, executive export |
| **Compliance Officer** | Regional rules | MENA PDPL/DPL adherence | Rules buried in code | `/settings/compliance`, audit PDF |
| **Workspace Admin** | Tenant setup | Team, SSO, integrations | Multi-tool config | `/settings/team`, `/settings/sso`, `/admin` |
| **Agency Principal** | Multi-client ops | Per-client FinOps rollup | No client switcher yet | `/settings/agencies` (read-only partial) |
| **External Approver** | Client sign-off | Approve/reject without full login | Email friction | `/approve/[token]` |

### 4.2 Workflow: AI Campaign (happy path)

```text
1. Operator → /ai-cmo/campaigns/new (Brief Wizard)
2. Optional: select Target Account (ABM dropdown)
3. Submit → POST /api/v1/ai-cmo/campaigns/brief → 202 + jobId
4. Poll GET /api/v1/ai-cmo/campaigns/jobs/{jobId}
5. Inngest: Strategic Brain → Creator → Policy V2 → Quality → Reconciler persist
6. IF policy tier MED/HIGH/CRITICAL → ai_cmo_approval_requests (pending)
7. Approver → /ai-cmo/approvals → PATCH approve
8. Optional: link to posts → 003 publish worker
```

### 4.3 Workflow: ABM Playbook activation

```text
1. ABM Operator → /ai-cmo/abm
2. GET /api/v1/ai-cmo/abm/accounts (live DB or empty state)
3. Click "Activate playbook" on account (intent ≥ threshold)
4. POST /api/v1/ai-cmo/abm/accounts/{id}/activate → 202 jobId
5. Row in abm_playbook_runs (status=processing)
6. Same campaign workflow as §4.2 with ABM-enriched objective
7. Rate limit: 10 activations/hour/workspace (Redis)
```

### 4.4 Workflow: CRM closed-won → attribution

```text
1. HubSpot/SFDC sends webhook → /api/integrations/crm/webhook/{hubspot|salesforce}?workspaceId=
2. HMAC verified → mirrorCrmActivity → crm_activity_mirror
3. calculateAttributionMetrics links account_domain → account_intent_scores.domain
4. persistAttributionReport (reportType=crm_closed_won)
5. RevOps exports executive summary from ABM dashboard
```

### 4.5 Decision tree: Content publish eligibility

```text
Content generated?
  ├─ Policy CRITICAL/block → STOP (never auto-publish)
  ├─ Policy MED/HIGH → Approval queue
  └─ Policy LOW + quality OK
        ├─ Platform Meta/IG?
        │     ├─ meta_app_review_status != approved → BLOCK publish
        │     └─ approved + OAuth connected → Worker publish
        └─ LinkedIn/X → OAuth connected → Worker publish
```

---

## 5. Use Cases

### UC-001 — Schedule and publish social post

| Field | Detail |
|-------|--------|
| **Actor** | Social Operator |
| **Preconditions** | OAuth connected for target platform; Meta requires App Review approved for FB/IG |
| **Main flow** | Create post → schedule → worker picks up → adapter publishes → status `published` |
| **Alternatives** | No connection → error; Meta gated → error message in worker log |
| **Success** | `posts.status = published`, analytics sync job runs |
| **Track** | 003 |

### UC-002 — Execute governed AI campaign from brief

| Field | Detail |
|-------|--------|
| **Actor** | AI CMO Operator |
| **Preconditions** | DIFY_API_KEY configured; budget policy exists |
| **Main flow** | Brief wizard → 202 job → poll completed → campaigns + content_pieces in SoR |
| **Alternatives** | Budget exceeded → job fails fast (Test B); policy block → approval required |
| **Success** | Job status `completed`; audit_logs entries |
| **Track** | 004 |

### UC-003 — Activate ABM playbook

| Field | Detail |
|-------|--------|
| **Actor** | ABM Operator |
| **Preconditions** | `account_intent_scores` seeded; user session or API key |
| **Main flow** | Select account → Activate → 202 → playbook run persisted |
| **Edge cases** | Rate limit exceeded → 429; account not found → 404 |
| **Success** | `abm_playbook_runs` row + campaign job enqueued |
| **Track** | 005 Sprint 18 |

### UC-004 — Ingest HubSpot closed-won

| Field | Detail |
|-------|--------|
| **Actor** | HubSpot (system) |
| **Preconditions** | Webhook registered; HUBSPOT_WEBHOOK_SECRET set; workspaceId in query |
| **Main flow** | deal.propertyChange closedwon → mirror → attribution report |
| **Alternatives** | Invalid signature → 403; no closed-won in batch → ignored |
| **Success** | `crm_activity_mirror` row with deal_value |
| **Track** | 005 Sprint 19 |

### UC-005 — Enable MENA compliance profile

| Field | Detail |
|-------|--------|
| **Actor** | Compliance Officer |
| **Preconditions** | Workspace admin access |
| **Main flow** | /settings/compliance → select mena_v1 → save → branding.compliance_profile updated |
| **Success** | Compliance agent injects MENA v1 rules; audit PDF includes attestation line |
| **Track** | 005 Sprint 19 |

### UC-006 — Operator monitors agent fleet

| Field | Detail |
|-------|--------|
| **Actor** | AI Ops Lead |
| **Preconditions** | Authenticated session |
| **Main flow** | /ai-cmo/control-plane → roster, MTD cost, pending approvals, failed jobs, last audit per agent |
| **Success** | JSON matches UI; data from cost_summary + audit_logs |
| **Track** | 005 Sprint 18–19 |

### UC-007 — Query platform channel risk heatmap

| Field | Detail |
|-------|--------|
| **Actor** | Compliance Officer, AI Ops Lead |
| **Preconditions** | API key scoped to workspace |
| **Main flow** | `GET /api/v1/ai-cmo/channel-risk` → per-platform score, riskTier, factors, liveSignals |
| **Alternatives** | No publish table → `liveSignals: null` (graceful); no evaluations → ruleset baseline only |
| **Success** | Response includes LinkedIn, X, Instagram, Facebook, TikTok rows with `generatedAt` |
| **Track** | S15-004-002 |

---

## 6. Functional Requirements

Requirements grouped by module. Status: **Shipped** | **Partial** | **Planned** | **Blocked**

### 6.1 Social publish & OAuth (003)

| ID | Requirement | Status |
|----|-------------|--------|
| FR-003-01 | OAuth for Meta, LinkedIn, X with encrypted token storage | Shipped |
| FR-003-02 | Schedule posts with worker publish loop | Shipped |
| FR-003-03 | Meta publish blocked until App Review approved | Shipped |
| FR-003-04 | Analytics sync on interval | Shipped |
| FR-003-05 | TikTok/Snapchat enum with graceful skip | Partial (stub) |

**Business rules:** `TOKEN_ENCRYPTION_KEY` required when `PUBLISHING_ENABLED=true`; tokens in `workspace_social_connections`.

### 6.2 AI CMO orchestration (004)

| ID | Requirement | Status |
|----|-------------|--------|
| FR-004-01 | Campaign create returns 202 + poll URL | Shipped |
| FR-004-02 | Inngest 8-function workflow mesh | Shipped |
| FR-004-03 | Policy Engine V2 — risk tier drives approval, not confidence alone | Shipped |
| FR-004-04 | FinOps budget guard pre-flight | Shipped |
| FR-004-05 | Memory hybrid PG + Qdrant (fallback if Qdrant down) | Partial (needs prod QDRANT_URL) |
| FR-004-06 | 8 agents registered (Brain, Creator, Optimizer, Compliance, Radar, Finance, Quant, Sentinel) | Shipped |

### 6.3 Enterprise revenue loop (005)

| ID | Requirement | Status |
|----|-------------|--------|
| FR-056–059 | ABM playbook activation + audit table | Shipped |
| FR-060–063 | CRM closed-loop (webhook + domain link + export) | Shipped (live config operator) |
| FR-064–066 | Agent control plane + last audit per agent | Shipped |
| FR-067–069 | MENA compliance profile pack | Shipped |
| FR-070–072 | Agency command center | Blocked (A-GATE-003) |

### 6.4 Cross-cutting non-functional

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-001 | Multi-tenant RLS on all tenant tables | Mandatory |
| NFR-002 | Reconciler-only SoR writes | Mandatory |
| NFR-003 | 003 regression suite green on 004/005 changes | **237+** unit tests |
| NFR-006 | Channel risk heatmap API with liveSignals | Shipped (S15-004-002) |
| NFR-007 | LLM circuit breaker (3 failures / 60s open) | Shipped (S16-T004) |
| NFR-008 | CI schema gate on main push | Shipped (T054) |
| NFR-004 | ABM activation API p95 < 500ms (excl. LLM) | Sprint 18 |
| NFR-005 | CRM webhook HMAC verification | Shipped |

---

## 7. Feature Specifications

| Feature | Purpose | User benefit | Priority | Introduced | Status | Dependencies |
|---------|---------|--------------|----------|------------|--------|--------------|
| OAuth publish | Real social posting | Brand presence on major networks | Must | 003 | Shipped | Meta App Review for FB/IG |
| Worker publish loop | Reliable delivery | Scheduled posts go live | Must | 003 | Shipped | Redis, worker process |
| Campaign brief wizard | Structured AI input | Faster executive campaigns | Must | 005 7b | Shipped | Dify, Inngest |
| Policy + approvals | Governance | Legal/compliance safety | Must | 004 | Shipped | — |
| ABM dashboard | Intent visibility | Prioritize accounts | Must | 005 | Shipped | ABM migrations |
| ABM activation | Intent → action | Close loop to campaigns | Must | 005 S18 | Shipped | Inngest, rate limit |
| Control plane | Agent observability | Operate AI fleet | Must | 005 S18 | Shipped | cost_summary, audit_logs |
| HubSpot webhook | CRM ingest | Revenue proof | Should | 005 S19 | Shipped | Operator webhook config |
| MENA compliance pack | Regional rules | PDPL/DPL certifiability | Should | 005 S19 | Shipped | settings/compliance |
| HubSpot OAuth | Full CRM auth | No manual tokens | Should | 005 S19 | **Partial (stub)** | DEC-003 |
| Agency command center | Multi-client ops | Agency scalability | Should | 005 S20 | **Blocked** | 000014, A-GATE-003 |
| TikTok/Snapchat live | Channel expansion | Youth markets | Nice | P2 | Planned | FR-P01 |
| Langfuse traces | LLM observability | Debug/agent SLA | Nice | 004 F | **Pending** | A-GATE-002 |
| Channel risk heatmap | Platform TOS risk scores | Proactive compliance | Should | S15 | **Shipped** | `GET /api/v1/ai-cmo/channel-risk` |
| LLM circuit breakers | Fail-fast on provider outage | Inngest safe retry | Must | S16 | **Shipped** | Dify + OpenRouter |
| Production ops runbooks | Cutover without code churn | DevOps velocity | Must | Ops | **Shipped** | `docs/OPS-*` |
| Performance SLA doc | Agent + infra targets | Hostinger sizing | Should | S17 | **Shipped** | `docs/PERFORMANCE-SLA.md` |

---

## 8. Business Scenarios

### Scenario A — MENA bank ABM demo (current pilot)

**Context:** Cairo Bank in seed data (`account_intent_scores`), compliance profile `mena_v1`.

| Step | Action | Outcome |
|------|--------|---------|
| 1 | ABM operator opens `/ai-cmo/abm` | 5 accounts, Vodafone Egypt 88/100 |
| 2 | Activates playbook on Vodafone | 202 jobId, `abm_playbook_runs` row |
| 3 | Campaign workflow runs with ABM context | Content enters approval if MED+ |
| 4 | Compliance officer enables MENA profile | Rules injected in Compliance agent |
| 5 | CFO downloads attribution export | CRM closed-won totals in text summary |
| **Success metric** | Demo completes in <15 min without manual SQL | **Achieved in UAT workspace** |

### Scenario B — Production telco publish (blocked)

**Context:** Etisalat workspace, Meta App Review pending.

| Step | Blocker |
|------|---------|
| Schedule Instagram post | `meta_app_review_status != approved` → worker throws |
| **Mitigation** | Complete `docs/OPERATOR-GATES.md` Meta process |

### Scenario C — HubSpot live revenue loop (operator-dependent)

| Step | Action |
|------|--------|
| 1 | Register webhook URL with workspaceId |
| 2 | Closed-won deal fires webhook |
| 3 | Domain matches `account_intent_scores.domain` |
| 4 | Attribution report updated |
| **Success metric** | ≥80% mirrored deals linked (FR-061 target) |

---

## 9. User Interface & Navigation

### 9.1 Information architecture

```text
Nexus Social
├── Dashboard (/)
├── Analytics (/analytics/*)
├── Calendar (/calendar)
├── Posts (/posts/create)
├── Inbox (/inbox)
├── Reputation (/reputation)
├── Automations (/automations/builder)
├── Copilot (/copilot)
├── AI Ops (/ai-ops)          ← hub, not under ai-cmo layout
├── AI CMO (/ai-cmo/*)        ← AiCmoNav sub-nav
│   ├── Control Plane
│   ├── ABM
│   ├── Attribution
│   ├── Campaigns / Brief Wizard
│   ├── Intelligence
│   └── Approvals
├── Settings (/settings/*)    ← SettingsNav
├── Admin (/admin)            ← owner/admin only
└── Public (/p/[slug], /approve/[token])
```

### 9.2 Key forms — field specifications

#### Brief Wizard (`/ai-cmo/campaigns/new`)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Target account | Search/select dropdown | No | From ABM accounts API |
| Role, Seniority, Domain, Market | Text | Yes | Brief context |
| Target role, Experience level | Text | Yes | |
| Artifact type | Dropdown | Yes | |
| Business context, Core objective | Textarea | Yes | |
| Secondary objectives 1–3 | Text | No | |
| Locale | Text/select | Yes | Default `en-US`; supports `ar-SA` |

#### Settings Integrations (`/settings`)

| Field | Type | Notes |
|-------|------|-------|
| Website URL | URL text | |
| Nexus Page slug | Text | Public `/p/{slug}` |
| Per-platform handle | Text | Twitter, LinkedIn, IG, FB, YouTube, TikTok |
| Per-platform profile URL | URL | |
| HubSpot Portal ID | Text | Stub section |
| HubSpot webhook URL | Read-only | Copy for operator |

#### Compliance (`/settings/compliance`)

| Field | Type | Options |
|-------|------|---------|
| Compliance profile | Radio | `global_default`, `mena_v1` |

#### Team (`/settings/team`)

| Field | Type | Options |
|-------|------|---------|
| Invite email | Email | |
| Role | Dropdown | member, admin, owner |

### 9.3 Navigation gaps (flagged)

| Route | Issue |
|-------|-------|
| `/settings/ai-agent`, `/settings/sso`, `/settings/migration`, `/settings/agencies` | Not in SettingsNav — reachable via direct URL or admin links |
| `/ai-ops` | Outside `ai-cmo` layout — uses button hub instead of AiCmoNav |

---

## 10. Authorization, Roles & Permissions

### 10.1 Workspace roles

| Role | Capabilities | Restrictions |
|------|--------------|--------------|
| **owner** | All settings, team invite, admin console | — |
| **admin** | Integrations, team (non-owner actions), admin console | Cannot transfer ownership (implicit) |
| **member** | Create content, campaigns, ABM actions | No team admin |

Enforced via Supabase RLS + `workspace_members` checks in server actions.

### 10.2 API authorization patterns

| Pattern | Used for |
|---------|----------|
| API key (`x-api-key`) | `/api/v1/*`, CRM, audit PDF |
| Session + workspace membership | UI server actions, OAuth start |
| Hybrid (API key OR session) | ABM routes, control plane |
| Webhook HMAC | HubSpot, SFDC, Chatwoot, Stripe |
| Internal bearer | Tools, CRM sync forward |
| Approval token HMAC | `/approve/[token]` |

### 10.3 Data visibility

| Data | Scope |
|------|-------|
| All SoR tables | `workspace_id` RLS |
| Agency brands (when 000014 applied) | `agency_members` + `is_agency_admin()` |
| Audit logs | Workspace-scoped; export via API key |
| Public Nexus Page | Published slug only — no auth |

### 10.4 Compliance constraints

- CRITICAL policy content **never** auto-publishes regardless of confidence score.
- MENA profile adds rules — does **not** replace Policy Engine tiers.
- Meta publish requires **`meta_app_review_status = approved`** (code enforced in `publish-due-posts.ts`).

---

## 11. Reports & Dashboards

| Dashboard / Report | Route / Export | Metrics | Data sources | Filters | Refresh | Audience |
|-------------------|----------------|---------|--------------|---------|---------|----------|
| Main dashboard | `/` | Workspace KPIs | posts, analytics | Date | On load | Operator |
| Analytics | `/analytics` | Engagement, trends | `post_analytics` | Platform, date | Sync interval | Marketing |
| AI Ops hub | `/ai-ops` | MTD cost, tokens, failed jobs, approvals | `ai_cmo_cost_summary`, `ai_cmo_failed_jobs`, `ai_cmo_approval_requests` | Workspace | On load | AI ops |
| Control plane | `/ai-cmo/control-plane` | Per-agent cost, last audit, roster | registry, cost_summary, audit_logs | Workspace | On load | AI ops |
| ABM dashboard | `/ai-cmo/abm` | Intent scores, funnel stage, touchpoints | `account_intent_scores`, `crm_activity_mirror` | — | On load | ABM operator |
| Attribution | `/ai-cmo/attribution` | First/last/linear, channel revenue | `attribution_reports` | Channel | On load | RevOps |
| Intelligence | `/ai-cmo/intelligence` | Paid media scores, anomalies | Import API + SoR | CSV upload | On import | Performance marketing |
| Executive audit PDF | ABM export action | Signed audit trail | `audit_logs` | 30-day window | On demand | CFO, Legal |
| Executive attribution TXT | ABM export action | Channel + CRM closed-won | attribution + CRM mirror | 30-day | On demand | CFO |
| Channel risk heatmap | API + future UI | Per-platform score, riskTier, factors, liveSignals | evaluations + posts + ruleset | Workspace | On request | Compliance, ABM |
| Admin health | `/admin` | DB, Redis, Chatwoot, Dify | health actions | — | On load | Admin |
| Custom reports | `/reports/builder` | User-defined widgets | Multiple | User-defined | On save | Power user |

---

## 12. Integration Requirements

### 12.1 External systems matrix

| System | Direction | Auth | Primary tables / endpoints |
|--------|-----------|------|---------------------------|
| **Supabase Postgres** | Bi | Service role + RLS | All SoR |
| **Redis** | Bi | URL | Jobs, rate limits, event bus |
| **Inngest** | In | Signing key | `/api/inngest` |
| **Dify** | Out | API key | Generation runtime |
| **OpenRouter** | Out | API key | Fallback LLM |
| **Meta / LinkedIn / X** | Bi | OAuth 2.0 | `workspace_social_connections`, publish adapters |
| **HubSpot** | In | Webhook HMAC + optional token | `crm_activity_mirror` |
| **Salesforce** | In | Webhook HMAC | `crm_activity_mirror` |
| **Chatwoot** | Bi | API token + webhook secret | Inbox AI, CSAT |
| **Stripe** | In | Webhook signature | `ai_credit_ledger` |
| **Shopify** | Out | Access token | Tools API (optional) |

### 12.2 Key API endpoints (summary)

Full inventory: 50 route files under `src/app/api`. Critical paths:

| Method | Path | Auth |
|--------|------|------|
| POST | `/api/v1/ai-cmo/campaigns` | API key |
| POST | `/api/v1/ai-cmo/campaigns/brief` | API key |
| GET | `/api/v1/ai-cmo/campaigns/jobs/{jobId}` | API key |
| POST | `/api/v1/ai-cmo/abm/accounts/{id}/activate` | Hybrid |
| GET | `/api/v1/ai-cmo/channel-risk` | API key |
| GET | `/api/v1/ai-cmo/agents/control-plane` | Hybrid |
| POST | `/api/integrations/crm/webhook/hubspot` | HMAC + workspaceId |
| POST | `/api/integrations/crm/webhook/salesforce` | HMAC + workspaceId |
| GET/POST | `/api/oauth/{platform}/{start\|callback}` | Session / state HMAC |
| GET/POST/PUT | `/api/inngest` | Inngest signing |

### 12.2.1 Channel Risk API response (`GET /api/v1/ai-cmo/channel-risk`)

**Auth:** `x-api-key` · **Status:** CLOSED S15-004-002

Each channel row includes optional `liveSignals` (null when publish-attempt table unavailable):

| Field | Type | Source |
|-------|------|--------|
| `score` | 0–100 | Ruleset base + evaluation violations |
| `riskTier` | LOW/MEDIUM/HIGH/CRITICAL | Derived from score |
| `factors[]` | id, label, severity | Curated TOS rules + rejection history |
| `liveSignals.rejectionRate24h` | 0.0–1.0 | `campaign_publish_attempts` or `posts` (24h) |
| `liveSignals.lastRejectionReason` | string \| null | Latest `publish_error` / failure_reason |

Policy integration: channel-risk advisories attach to `structured-policy-review` as **non-blocking** hints (does not override CRITICAL tier).

### 12.3 Data flow — campaign + ABM

```text
Client → POST /campaigns/brief → Redis job store → Inngest CAMPAIGN_REQUESTED
  → Strategic Brain (Dify/OpenRouter) → Creator → Policy V2 → Quality
  → secureSyncToSoR (ai_cmo_campaigns, content_pieces, evaluations)
  → [optional] posts → worker → Meta/LinkedIn/X APIs

ABM Activate → same Inngest path + abm_playbook_runs row
```

### 12.4 Performance considerations

| Area | Consideration |
|------|---------------|
| Campaign API | 202 async — no blocked HTTP >30s |
| API key routes | Redis rate limit per workspace |
| Worker | Separate process from Next.js — must co-deploy |
| Qdrant | Optional — PG fallback if unavailable |
| Webhooks | Must verify HMAC before any SoR write |

### 12.5 Security gaps (flagged)

| Endpoint | Issue |
|----------|-------|
| `/api/v1/ai-cmo/confidence` | **No auth** — utility endpoint |
| `/api/setup/sql` | **No auth** — serves SQL files (dev/setup risk in prod) |

---

## 13. Technical Architecture

### 13.1 Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, React, Tailwind, next-intl (en/ar) |
| API | Next.js App Router route handlers |
| Database | Supabase Postgres + RLS |
| Cache / queue | Redis (ioredis), Redis Streams |
| Orchestration | Inngest (8 functions) |
| AI runtime | Dify (primary), OpenRouter (fallback) |
| Vectors | Qdrant (optional hybrid memory) |
| Worker | Node worker (`src/bin/worker.ts`) |
| Auth | Supabase Auth + NextAuth SAML stub |
| Tests | Vitest (**237** unit), Playwright, k6 load scripts |

### 13.2 Architectural principles (binding)

1. **SoR / SoI split** — reconciler-only writes to Postgres.
2. **Dify is runtime, not orchestrator.**
3. **Event-driven** — marketing event bus, Inngest for long workflows.
4. **Zero regression** — 003 publish/OAuth protected on every 004/005 change.

### 13.3 Agent mesh (8 agents)

| Agent | Tier | Implementation | Role |
|-------|------|----------------|------|
| Strategic Brain | Core | Legacy + Dify | Campaign planning, ABM context |
| Creator | Core | Legacy + Dify | Content generation |
| Optimizer | Operational | Mesh | Replan proposals |
| Radar | Operational | Mesh | External signals |
| Quant | Operational | Mesh | Analytics hints |
| Sentinel | Governance | Mesh | Anomaly detection |
| Finance | Governance | Mesh | ROI / budget hints |
| Compliance | Governance | Mesh | MENA/EU advisories |

### 13.4 Infrastructure requirements (production)

#### Cloud-managed services (required)

| Component | Production service | Notes |
|-----------|-------------------|-------|
| Database | **Supabase Postgres** | Not on VPS |
| Redis | **Upstash** (or managed Redis) | Not on VPS — `REDIS_URL` |
| LLM | **Dify Cloud + OpenRouter** | `USE_LOCAL_OLLAMA` banned in prod |
| Orchestration | **Inngest Cloud** | Cloud signing key, not Dev CLI key |
| Vectors | Qdrant Cloud (optional) | PG fallback if unset |

#### Hostinger VPS constraints (Track 2 target)

| Rule | Value | Enforcement |
|------|-------|-------------|
| Total RAM | 8GB | Hostinger plan |
| Nexus container | **3GB hard cap** | Docker `deploy.resources.limits.memory: 3g` |
| Reverse proxy | **Caddy** (SSL + routing) | No Nginx |
| Deploy orchestrator | **Hermes AI (SSH)** | Not GitHub Actions CD for prod |
| Forbidden on VPS | Postgres, Redis, Ollama containers | Ops runbook |

See: [`OPS-PROD-CUTOVER.md`](./OPS-PROD-CUTOVER.md) · [`PERFORMANCE-SLA.md`](./PERFORMANCE-SLA.md) · [`.env.production.template`](../.env.production.template)

#### Application processes

| Component | Requirement |
|-----------|-------------|
| Next.js app | Node 20+, standalone build |
| Worker | Same env as app, Upstash Redis access |
| Supabase | Prod project, migrations through `20260701` |
| Inngest Cloud | Signing + event keys |
| Dify | Published apps (A-GATE-005) |

### 13.5 Scalability (current vs target)

| Dimension | Current (pilot) | Target (004 audit) | Gap |
|-----------|-----------------|---------------------|-----|
| Workspaces | Demo / UAT | 5,000 | Observability, agency hierarchy, DR |
| Uptime | Dev/staging | 99.9% | Circuit breakers exist; OTel partial |
| Agencies | Schema ready | 500 agencies | A-GATE-003 + Sprint 20 UI |

---

## 14. Competitive Context

### 14.1 Feature comparison matrix

| Capability | Nexus Social | Hootsuite / Sprout | HubSpot Marketing | Jasper / Copy.ai |
|------------|--------------|--------------------|--------------------|------------------|
| Multi-platform publish (FB/IG/LI/X) | **Yes** (Meta gated) | **Yes** | Partial | No |
| OAuth token vault | **Yes** encrypted | Yes | N/A | N/A |
| AI campaign workflow (multi-step) | **Yes** governed | Limited | Limited sequences | Single-shot |
| 8-agent mesh + control plane | **Yes** | No | No | No |
| Policy / approval tiers | **Yes** | Basic approval | Basic | No |
| ABM intent → campaign activation | **Yes** | No native | Workflows | No |
| CRM closed-won → attribution | **Yes** (webhook) | Integrations | **Native** | No |
| MENA compliance product module | **Yes** mena_v1 | Generic | Generic | No |
| Signed audit PDF | **Yes** | No | Partial logs | No |
| TikTok/Snapchat live publish | **No** (stub) | **Yes** | No | N/A |
| HubSpot native OAuth CRM | **Partial** stub | N/A | **Native** | N/A |
| Enterprise SSO | Stub (SAML route) | Yes | Yes | Varies |

**Differentiation:** Nexus wins on **governed agent orchestration + reconciler audit + ABM-to-CRM revenue loop**. Incumbents win on **channel breadth, CRM native depth, and market maturity**.

---

## 15. Data & Privacy

### 15.1 Data collected

| Category | Examples | Storage |
|----------|----------|---------|
| Account | email, display name | Supabase Auth / users |
| Workspace | branding JSON, compliance_profile | workspaces |
| Social content | post bodies, schedules | posts |
| AI artifacts | campaigns, content_pieces, evaluations | ai_cmo_* |
| ABM | intent scores, domains, topics | account_intent_scores |
| CRM mirror | deal values, domains | crm_activity_mirror |
| Audit | actions, metadata | audit_logs |
| OAuth tokens | encrypted | workspace_social_connections |

### 15.2 Compliance frameworks

| Framework | Implementation |
|-----------|----------------|
| **GDPR** | Policy engine, PII scrubber in reconciler path, data region from tenants |
| **UAE PDPL** | MENA_PDPL_RULES + mena_v1 profile |
| **Egypt DPL** | mena_v1 regulated-claims rules |
| **Meta platform policy** | App Review gate |

### 15.3 Retention & privacy (current state)

| Topic | Status |
|-------|--------|
| Formal retention policy document | **GAP — requires legal stakeholder input** |
| Right to erasure workflow | Partial via Supabase — **not fully documented** |
| Data residency enforcement | `tenants.data_region` field exists — **enforcement partial** |
| Audit log immutability | HMAC-signed PDF export; DB rows append-only by convention |

### 15.4 Privacy safeguards

- RLS on all tenant tables.
- No secrets in repo or logs (constitution).
- Webhook signature verification before CRM ingest.
- Confidence scores **cannot** override CRITICAL blocks.

---

## 16. Implementation Roadmap

### 16.1 Completed phases

| Phase | Deliverable | Verification |
|-------|-------------|--------------|
| 003 Sprints 1–11 | Publish + OAuth + worker | 003 regression suite |
| 004 Sprint 12–13 | AI CMO foundation, campaigns | schema:verify:004 |
| 004 Sprint 14+ | Inngest, FinOps, approvals | 58/58 tasks |
| 005 Phase 7a/b | Brief + intelligence UI | UI + API tests |
| 005 Sprint 18 | ABM activation + control plane | verify:abm-seed |
| 005 Sprint 19 | CRM webhooks + MENA pack | 237 unit tests |
| Track 1 Ops (2026-07-03) | Runbooks, env template, verify scripts, doc drift | GATES-REMAINING.md |
| S15–S17 partial | Channel risk, circuit breakers, perf SLA, CI schema gate | typecheck PASS |

### 16.2 Current phase — production cutover (human-gated)

| Milestone | Owner | Dependency |
|-----------|-------|------------|
| Prod Supabase + migrations | DevOps | DEC-005 |
| `.env.production` filled | DevOps | B4 |
| Meta App Review | Business | B1 |
| OAuth UAT T053–T056 | Operator | B2 |
| Dify publish + ai:verify | Operator | A-GATE-004 |
| Executive sign-off | Product/CTO | B3 |
| Staging k6 + Playwright | QA/Ops | B5, B6 |
| Track 2 Hermes VPS base | DevOps | DEC-006 |

### 16.3 Next engineering phases

| Phase | Scope | Blocker |
|-------|-------|---------|
| **Track 2** | Hostinger base: Docker, Caddy, UFW, `/opt/platform` | Hermes SSH execution |
| **005 Sprint 20** | Agency switcher, FinOps rollup, client portal | A-GATE-003 (CL-029) |
| **S15–S17 remainder** | Radar live data, eval UI, full HubSpot OAuth | Post-launch |
| **FR-P01** | TikTok/Snapchat live publishers | P2 |
| **A-GATE-002** | Langfuse + OTel production | CIO decision |

### 16.4 Resource requirements (estimate)

| Role | Cutover phase | Scale phase |
|------|---------------|-------------|
| DevOps | 1 FTE — 2 weeks | Ongoing |
| Operator/Business | Meta + OAuth UAT | — |
| Engineering | 0 FTE (code complete for pilot) | 2–3 FTE for S15–S20 |
| Security | PDPL review session | A-GATE-005 |

---

## 17. Risks & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Meta App Review delay | High | Blocks FB/IG publish | LinkedIn/X pilot first; communicate gate in UI |
| HubSpot webhook misconfiguration | Medium | No CRM attribution | OPS runbook + verify script |
| Doc/spec drift | Medium | Wrong implementation | **This PRD** + Speckit converge cadence |
| Qdrant unavailable in prod | Medium | Degraded memory | PG fallback already implemented |
| Redis SPOF | Medium | Publish + jobs stop | Managed Redis, health checks, co-deploy worker |
| Over-trust in confidence scores | Low | Compliance incident | Policy tier supremacy (constitution) |
| Agency scope creep before gate | Medium | RLS complexity | Block Sprint 20 until A-GATE-003 |
| Unauthenticated API endpoints | Low | Abuse | Harden `/confidence`, `/setup/sql` in prod |

---

## 18. Assumptions & Constraints

### 18.1 Assumptions

1. Pilot customers accept **webhook-first** HubSpot integration before full OAuth.
2. Dify Strategic Brain + Creator apps will be published by operator (A-GATE-004).
3. Single Supabase project sufficient for pilot; prod is separate project.
4. English and Arabic locales cover initial MENA UX (`en`, `ar` in i18n).
5. Workspace is primary tenant boundary; agency hierarchy is additive.

### 18.2 Constraints

1. **Constitution** overrides conflicting PRD prose.
2. **No agent SoR writes** — all mutations via reconciler.
3. **No Dify orchestration** — Inngest owns workflow state.
4. **003 regression** must stay green.
5. **Production VPS** uses cloud-only data stores — no local Redis/Postgres/Ollama (RAM constraint).
6. GitHub repo: `waleedhewalla78-sudo/NEXUS`.

---

## 19. Appendices

### Appendix A — Glossary

| Term | Definition |
|------|------------|
| **SoR** | System of Record — Supabase transactional tables |
| **SoI** | System of Intelligence — Redis, vectors, agent scratch |
| **ABM** | Account-Based Marketing |
| **AI CMO** | Nexus Social AI CMO — governed agent campaign layer |
| **Reconciler** | `secureSyncToSoR` validation + audit write path |
| **BOFU/MOFU/TOFU** | Bottom/middle/top of funnel |
| **RLS** | Row-Level Security (Postgres) |
| **Speckit** | Spec-driven workflow (constitution → specify → tasks → implement) |
| **UAT** | User acceptance testing — automated + operator gates |

### Appendix B — Feature track FR index (cross-reference)

| Track | FR range | Spec location |
|-------|----------|---------------|
| 003 | US1–11 | `specs/003-real-integrations-production/` |
| 004 | FR-001–055 | `specs/004-ai-cmo-master-prd-v3/spec.md` |
| 005 Revenue | FR-056–072 | `specs/005-enterprise-revenue-loop/spec.md` |
| Deployment | FR-D01–D05 | `specs/000-nexus-program/spec.md` |

### Appendix C — Entity relationship (core)

```text
tenants ──< workspaces ──< workspace_members >── users
workspaces ──< brands ──< ai_cmo_campaigns ──< ai_cmo_content_pieces
workspaces ──< posts ──< post_analytics
workspaces ──< account_intent_scores
workspaces ──< crm_activity_mirror
workspaces ──< attribution_reports
workspaces ──< abm_playbook_runs >── account_intent_scores
agencies ──< agency_members (when 000014 applied)
agencies ──< brands.agency_id
```

### Appendix D — Migration order (production)

| Order | Migration | Purpose |
|-------|-----------|---------|
| 1 | 000001–000010 | 003 baseline |
| 2 | 000011–000012 | 004 hierarchy + foundation |
| 3 | 000013–000015 | Sprint 14 GA (optional until leadership gate) |
| 4 | 20260630 | ABM tables |
| 5 | 20260701 | abm_playbook_runs |
| — | 000014 | **Agencies — only after A-GATE-003** |

After apply: `NOTIFY pgrst, 'reload schema';`

### Appendix E — Verification commands

| Command | Purpose |
|---------|---------|
| `npm run typecheck` | TypeScript |
| `npm run test:unit` | 239 unit tests |
| `npm run verify:production:code` | Local prod gate (typecheck + unit + schema) |
| `npm run verify:production:uat` | UAT gate (integration + uat:check-schema) |
| `npm run verify:production:deploy` | Live deploy gate (health + inngest + ai:verify) |
| `npm run uat:check-schema` | 13 UAT tables |
| `npm run verify:abm-seed` | ABM + activate smoke |
| `npm run uat:postman-ab` | Campaign A/B |
| `npm run test:live-integration` | 5/5 closed loop |
| `npm run verify:inngest-cloud` | Inngest prod config |
| `npm run ai:verify` | Dify apps |

### Appendix F — Version history

| Version | Date | Changes |
|---------|------|---------|
| **1.0.0** | 2026-07-03 | Initial master PRD — consolidates 003/004/005 as-built state |
| **2.0.0** | 2026-07-03 | Track 1 alignment: ops runbooks, Hostinger constraints, channel-risk liveSignals, circuit breakers, CI schema gate, Appendix I session report |
| **2.1.0** | 2026-07-03 | Post-GitHub push (`72f7b91`): 239 tests, UC-007 channel risk, DEC-006 VPS paused, GitHub as source of truth |

### Appendix G — Open GitHub issues (tracking drift)

Issues **#7–#19** on `waleedhewalla78-sudo/NEXUS`: Sprint 18–19 work **shipped** — close via `scripts/close-sprint-18-19-issues.sh`. **#14 stays open** (HubSpot OAuth stub per CL-026).

### Appendix H — Related documents

| Document | Path |
|----------|------|
| Constitution | `CONSTITUTION.md` |
| Launch checklist | `LAUNCH_CHECKLIST.md` |
| Pre-deployment | `docs/PRE-DEPLOYMENT-CHECKLIST.md` |
| Remaining gates | `docs/GATES-REMAINING.md` |
| Prod cutover | `docs/OPS-PROD-CUTOVER.md` |
| Performance SLA | `docs/PERFORMANCE-SLA.md` |
| Operator gates | `docs/OPERATOR-GATES.md` |
| UAT sign-off | `docs/UAT-SIGNOFF-RESULTS.md` |
| Feature 005 tasks | `specs/005-enterprise-revenue-loop/tasks.md` |
| Cross-artifact analysis | `specs/005-enterprise-revenue-loop/analysis.md` |

---

## Appendix I — Track 1 Operations Report (2026-07-03)

**Period:** ~7 hours (Cursor engineering session)  
**Scope:** Documentation alignment, ops hardening, S15–S17 partial code, CI gate — **no Sprint 20, no Agency UI, no local Redis/Ollama on VPS**  
**Constitution boundaries honored:** CL-023 (campaign path reuse) · CL-029 (Agency blocked) · CL-030 (no workflow step order / reconciler / webhook auth changes)

### I.1 Executive summary (business)

| Dimension | Before session | After session |
|-----------|----------------|---------------|
| **Launch readiness score** | 7.0 combined | **7.8** — staging/pilot OK |
| **Production blockers** | Unclear gate ownership | Documented in `GATES-REMAINING.md` (B1–B6, A-GATE-002/003/005) |
| **Ops readiness** | Scattered checklists | 8 runbooks + `.env.production.template` + `verify:production:*` |
| **Hostinger deploy path** | Undefined | Documented: 8GB VPS, 3GB container, Caddy, Upstash, Hermes SSH |
| **GitHub issue drift** | #7–#19 open despite shipped work | Close script ready (#14 stays open for HubSpot OAuth stub) |
| **Enterprise demo credibility** | ABM + CRM partially documented | Sprint 18–19 fully reflected; ABM activate 202 verified |

**Business outcome:** Leadership can approve **controlled enterprise pilot** on staging; production external traffic remains gated on Meta App Review, OAuth UAT, executive sign-off, and prod secrets — not on missing engineering artifacts.

### I.2 Technical deliverables

#### Phase 1 — Documentation drift (P4)

| Item | File | Change |
|------|------|--------|
| Cross-artifact analysis | `specs/005-enterprise-revenue-loop/analysis.md` | 237 tests, 13/13 schema, go-live 7.8 |
| GitHub issue close script | `scripts/close-sprint-18-19-issues.sh` | Closes #7–#13, #15–#19; leaves #14 open |
| SPECKIT status | `specs/005-enterprise-revenue-loop/SPECKIT-STATUS.md` | Sprint 18–19 complete |

#### Phase 2 — Ops templates (P3 / Hostinger)

| Item | File |
|------|------|
| Production env template | `.env.production.template` (Upstash comment, Ollama banned) |
| Hostinger constraints section | `docs/OPS-PROD-CUTOVER.md` |
| Performance SLA | `docs/PERFORMANCE-SLA.md` |

**Ops runbooks created:** `OPS-PROD-CUTOVER`, `OPS-META-APP-REVIEW`, `OPS-OAUTH-UAT-RUNBOOK`, `OPS-DIFY-PUBLISH`, `OPS-STAGING-VERIFICATION`, `OPS-HUBSPOT-LIVE-CONFIG`, `OPS-SALESFORCE-WEBHOOK`, `GATES-REMAINING`

**Verify orchestrator:** `npm run verify:production:code|uat|deploy|all` via `scripts/verify-production.ts`

#### Phase 3 — S15–S17 backlog code (partial)

| ID | Deliverable | Files |
|----|-------------|-------|
| **S16-T004** | LLM circuit breakers (3 failures / 60s open) | `circuit-breaker.ts`, `dify/client.ts`, `openrouter.ts`, `provider-router.ts`, `ai/errors.ts` |
| **S15-004-002** | Channel risk API depth + liveSignals | `channel-risk/ruleset.ts`, `aggregator.ts`, `live-signals.ts` |
| **S17-T005** | Performance SLA documentation | `docs/PERFORMANCE-SLA.md` |

**Channel risk:** `GET /api/v1/ai-cmo/channel-risk` returns per-platform `score`, `riskTier`, `factors[]`, `lastUpdatedAt`, and `liveSignals` (24h rejection rate from `posts` fallback; `campaign_publish_attempts` when table exists).

**Circuit breaker behavior:** Production `ProviderRouter` throws `AIProviderUnavailableError` when all providers fail — enables Inngest retry; dev/test retains stubbed fallback.

#### Phase 4 — CI schema gate (T054)

| Item | Change |
|------|--------|
| `.github/workflows/ci.yml` | `schema-gate` job on `push` to `main` → `npm run uat:check-schema` |
| Secrets required | `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |

### I.3 Verification matrix (session end)

| Gate | Command | Result |
|------|---------|--------|
| TypeScript | `npm run typecheck` | **PASS** |
| Unit tests | `npm run test:unit` | **237 passed**, 1 skipped |
| Channel risk tests | `npm run test:unit -- channel-risk` | **7 passed** |
| Production code gate | `npm run verify:production:code` | **PASS** |
| UAT schema (local UAT DB) | `npm run uat:check-schema` | **13/13 OK** |
| ABM smoke | `npm run verify:abm-seed` | **PASS** (activate 202) |

### I.4 Files modified (complete inventory)

**Created (19):** `.env.production.template`, 8× `docs/OPS-*.md`, `docs/GATES-REMAINING.md`, `docs/PERFORMANCE-SLA.md`, `scripts/verify-production.ts`, `scripts/verify-production-health.ts`, `scripts/close-sprint-18-19-issues.sh`, `scripts/close-github-issues-005-shipped.ps1`, `src/lib/ai/errors.ts`, `src/lib/ai-cmo/channel-risk/ruleset.ts`, `src/lib/ai-cmo/channel-risk/live-signals.ts`, 2× channel-risk test files

**Modified (22):** `.env.example`, `package.json`, `LAUNCH_CHECKLIST.md`, `.github/workflows/ci.yml`, 5× docs (UAT, PRE-DEPLOY, OPS-PROD-CUTOVER), 3× specs (analysis, SPECKIT-STATUS, program spec), 8× src (circuit breaker, dify, openrouter, provider-router, aggregator, policy types, campaign-workflow-deps), 3× test files

### I.5 Explicitly NOT changed (per CL-023–CL-030)

| Area | Reason |
|------|--------|
| `inngest-campaign-workflow.ts` step order | CL-030 regression boundary |
| `reconciler.ts` validation | CL-030 |
| Meta/LinkedIn webhook auth | CL-030 |
| Sprint 20 / migration `000014` | CL-029 Agency gate |
| Agency switcher UI | CL-029 |
| Local Redis/Ollama in production templates | RAM + ops constraints |
| HubSpot full OAuth (#14) | CL-026 — stub by design |

### I.6 Operational next steps

| Priority | Action | Owner |
|----------|--------|-------|
| P0 | Run Track 2 Hermes VPS (Docker + Caddy) — fix `ufw` typo in prompt | DevOps |
| P0 | Fill prod secrets from `.env.production.template` | DevOps |
| P1 | Close GitHub #7–#19 via close script | PM/Eng |
| P1 | Meta App Review (B1) | Product |
| P1 | OAuth UAT T053–T056 (B2) | QA |
| P2 | DEC-002 agency hierarchy approval | Leadership |
| P2 | Wire Caddy → Nexus container after Track 2 | DevOps |

### I.8 GitHub deployment (2026-07-03)

| Item | Value |
|------|-------|
| Commit | `72f7b91` on `main` |
| Remote | https://github.com/waleedhewalla78-sudo/NEXUS |
| Files | 73 changed (+4896 / −204 lines) |
| Excluded | `nexus-social-app.json` (secrets — gitignored) |
| CI | `.github/workflows/ci.yml` — includes `schema-gate` on push (needs Supabase secrets) |

---

**End of document.** For implementation changes, update Speckit `tasks.md` first, then amend this PRD on milestone close.
