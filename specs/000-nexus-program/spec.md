# Nexus Social Platform — Program Specification

**Speckit `/speckit.specify`** · **Date:** 2026-07-04  
**Tracks:** 003 (Production) · 004 (AI CMO Enterprise) · 005 (Revenue / GTM) · Sprint 2–4 (Enterprise skin → Lighthouse)  
**Full cycle:** [`SPECKIT-CYCLE.md`](./SPECKIT-CYCLE.md)

---

## What we have built (shipped)

### Feature 003 — Real Integrations Production

| Capability | Status |
|------------|--------|
| OAuth + encrypted token vault | ✅ |
| Publish adapters: **Facebook, Instagram, LinkedIn, X** | ✅ |
| Schedule posts + worker publish loop | ✅ |
| Analytics sync + listening | ✅ |
| Chatwoot inbox AI orchestration | ✅ |
| Webhooks + marketing event bus | ✅ |

### Feature 004 — AI CMO Enterprise (58/58 Speckit tasks)

| Capability | Status |
|------------|--------|
| Async campaigns (202 + poll) | ✅ |
| Inngest 8-function mesh | ✅ |
| Strategic Brain → Creator → Judge → link-post | ✅ |
| Policy Engine V2 + approval queue | ✅ |
| FinOps budget + cost ledger | ✅ |
| Memory (PG + Qdrant) + outcome ingestion | ✅ |
| 8 agents: Brain, Creator, Optimizer, Compliance, Radar, Finance, Quant, Sentinel | ✅ |
| Agency hierarchy (000014) + channel-risk API | ✅ |
| ProviderRouter (Dify → OpenRouter) + circuit breakers | ✅ |
| PII scrubber + uniqueness guard | ✅ |
| V2.0 local bootstrap + verify scripts | ✅ |

### Feature 005 — Enterprise Revenue Loop (Sprint 18–19 shipped)

| Capability | Status |
|------------|--------|
| ABM dashboard + playbook activation | ✅ |
| HubSpot + Salesforce inbound webhooks | ✅ |
| HubSpot batch sync (`sync:hubspot-deals`) | ✅ |
| CRM domain attribution + executive export | ✅ |
| MENA compliance profile + settings UI | ✅ |
| Control plane last-audit | ✅ |

**Blocked:** Sprint 20 (agency switcher, FinOps rollup, client portal) — **A-GATE-003** / migration `000014`.

**Ops close-out (2026-07-03):** [`.env.production.template`](../nexus-social-app/.env.production.template) · [`docs/GATES-REMAINING.md`](../nexus-social-app/docs/GATES-REMAINING.md) · `npm run verify:production:*`

### Sprint 2–3 — Enterprise skin & GTM (shipped on `main`)

| Capability | Status |
|------------|--------|
| `enterprise_leads` migration + inbound API | ✅ code |
| `/enterprise` landing + lead form | ✅ |
| Feature flags (SaaS UI / enterprise landing) | ✅ |
| Meta Lead Ads webhook | ✅ |
| LinkedIn OAuth + `/settings/integrations` | ✅ |
| Hermes secrets + prod migration apply | ⬜ operator |

**Sprint 4:** Sales motion only until signed pilot; then `provision-pilot-client.ts` (no self-serve UI).

### Sprint 5–7 — Outcomes & intelligence

| Capability | Status |
|------------|--------|
| Pilot case-study simulator | ✅ `generate:pilot-report` |
| Intelligence CSV ingest + feed | ✅ `/intelligence` |
| Executive briefing agent (Inngest + manual) | ✅ |
| Enterprise QA harness | ✅ `qa:enterprise` |
| Pit Crew `/admin` (Sprint 6) | 🔒 payment gate |

### Feature 005 — Product Intelligence (Phase 7a)

| Capability | Status |
|------------|--------|
| Campaign brief API (`/campaigns/brief`) | ✅ |
| Paid media import API + entity scoring | ✅ |
| Unit tests (paid-media scorer) | ✅ |

---

## What we want to build (remaining)

### P0 — Deployment gates (human + automated)

| ID | Requirement | Acceptance |
|----|-------------|------------|
| FR-D01 | Live integration 5/5 PASS | `npm run test:live-integration` |
| FR-D02 | Postman Test A: 202 → completed | `npm run uat:postman-ab` |
| FR-D03 | Postman Test B: budget block | Job fails fast with budget message |
| FR-D04 | 003 operator UAT T053–T057 | OAuth → live publish → analytics |
| FR-D05 | Executive sign-off | `docs/UAT-SIGNOFF-RESULTS.md` |

### P1 — Feature 005 Phase 7b (Nexus-native UI)

| ID | User story | Acceptance |
|----|------------|------------|
| US-012b | Brief wizard UI at `/ai-cmo/campaigns/new` | Form → brief API → poll job | ✅ |
| US-013b | Intelligence dashboard | CSV upload → Recharts tabs → Quant hints | ✅ |
| US-014 | Calendar HTML export from SoR campaigns | Download from intelligence page | ✅ |

### P2 — Platform expansion

| ID | Requirement | Notes |
|----|-------------|-------|
| FR-P01 | TikTok / Snapchat publishers | Enum + graceful skip; live adapters deferred (P2) |
| FR-P02 | Higgsfield-style creative prompts | Creator agent extension |
| FR-P03 | Inngest Cloud + prod secrets | DevOps |
| FR-P04 | Pentest execution | S17 scope |
| FR-P05 | SAML IdP production config | Enterprise |

---

## User stories (consolidated)

| ID | Story | Track | Priority |
|----|-------|-------|----------|
| US-001 | Operator schedules post → worker publishes | 003 | P0 |
| US-002 | API triggers AI campaign → completed job | 004 | P0 |
| US-003 | Compliance blocks CRITICAL content | 004 | P0 |
| US-004 | Approver reviews queue | 004 | P1 (UI partial) |
| US-005 | Underperforming campaign triggers replan | 004 | ✅ |
| US-006 | Budget cap blocks spend | 004 | P0 UAT |
| US-007 | Radar feeds Brain memory | 004 | ✅ |
| US-008 | Sentinel detects anomalies | 004 | ✅ |
| US-009 | Finance summarizes ROAS | 004 | ✅ |
| US-010 | SSO for enterprise tenants | 004 | P2 |
| US-011 | Inbox AI replies via Chatwoot | 003 | ✅ |
| US-012 | Executive brief → campaign | 005 | ✅ API |
| US-013 | Paid media CSV → scored entities | 005 | ✅ API |

---

## Out of scope

- Standalone Claude/React artifact apps inside the monorepo
- TikTok/Snapchat publish (until FR-P01)
- Replacing 003 publish with 004-only path
