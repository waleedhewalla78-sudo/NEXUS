# 1. Product Vision & Scope

← [PRD Index](./README.md) · [PRD Status](./PRD-STATUS.md)

---

## 1.1 Vision

NEXUS is an **AI-native autonomous revenue operating system** for MENA enterprise marketing. It combines:

- **Omnichannel social publishing** (Facebook, Instagram, LinkedIn, X)
- An **8-agent AI CMO mesh** (Strategic Brain, Creator, Judge, Compliance, Radar, Finance, Quant, Sentinel)
- **ABM intent scoring**, CRM closed-loop attribution, and FinOps cost governance
- **Enterprise GTM** (public landing, inbound leads, Meta Lead Ads webhook)
- **Intelligence funnel** (CSV/webhook ingest → executive AI briefs)

Sold and operated as **Diligent AI** — an agency that deploys the mesh for clients; not self-serve multi-tenant SaaS for pilots.

---

## 1.2 In scope (shipped or code-complete on `main`)

| Track | Scope | Version / Sprint |
|-------|-------|------------------|
| **003 — Real Integrations** | OAuth, encrypted tokens, publish adapters, worker, analytics, Chatwoot inbox AI, webhooks, Stripe billing hooks | Sprints 1–11 |
| **004 — AI CMO Enterprise** | Async campaigns (202+polling), Inngest mesh, policy engine, approvals, FinOps ledger, memory (PG+Qdrant), 8 agents | Sprint 12+ |
| **005 — Revenue loop** | ABM dashboard, playbook activation, HubSpot/Salesforce webhooks, attribution export, MENA compliance, control plane | Sprints 18–19 |
| **Enterprise skin** | Feature flags, `/enterprise` landing, `enterprise_leads`, internal leads dashboard | Sprint 2 |
| **GTM integrations** | LinkedIn OAuth, Meta Lead Ads webhook, `/settings/integrations` | Sprint 3 |
| **Pilot ROI simulation** | `generate:pilot-report` CLI | Sprint 5 |
| **Intelligence** | CSV ingest, anomaly detection, briefing agent, `/intelligence` feed, weekly Inngest cron | Sprint 7 |
| **QA harness** | `qa:enterprise` + master plan | QA pass |

---

## 1.3 Explicitly out of scope

| Item | Reason | Reference |
|------|--------|-----------|
| Native GA4 / Meta Ads / WhatsApp sync workers | 8GB RAM; funnel model | CL-038 |
| TikTok / Snapchat live publish | Enum stub only | FR-P01 |
| Self-serve pilot onboarding UI | High-touch agency | CL-033/034 |
| Pit Crew `/admin` + margin dashboard | Payment-gated | CL-036 |
| `provision-pilot-client.ts` | Sales-gated | CL-033 |
| Sprint 20 agency switcher / client portal | A-GATE-003 / `000014` | CL-029 |
| Standalone Claude/React artifact apps | Native APIs only | CL-006-001 |
| Modify `campaign-workflow.ts` / `reconciler.ts` | Regression boundary | CL-030 |
| Intelligence charts / PDF V1 | Text-only V1 | CL-040 |
| Dify as orchestrator | Inngest orchestrates | Constitution §2 |
| Direct SoR writes from agents | Reconciler-only | Constitution §2 |

---

## 1.4 Scope evolution

| Era | Change | Why |
|-----|--------|-----|
| 003 baseline | Real OAuth + publish | Production credibility |
| 004 additive | AI CMO mesh | Enterprise AI without 003 regression |
| 005 revenue | ABM + CRM attribution | Prove closed-won revenue |
| Sprint 2 | Enterprise skin via env flags | One codebase, two GTM skins |
| Sprint 3 | Meta Lead Ads bypasses App Review for leads | Unblock GTM while B1 pending |
| Sprint 4 deferral | No provision script pre-sale | Agency-led |
| Sprint 6 deferral | Pit Crew pre-payment | Revenue before internal tools |
| Sprint 7 | CSV funnel + briefs | 2-week sprint realism |
| Infra pivot | GHCR pre-built images | Faster VPS deploy |

---

*See also: [16 Implementation Roadmap](./16-implementation-roadmap.md) · [18 Assumptions & Constraints](./18-assumptions-constraints.md)*
