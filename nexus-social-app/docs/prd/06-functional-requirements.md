# 6. Functional Requirements

← [PRD Index](./README.md) · [07 Feature Specs](./07-feature-specifications.md)

---

## 6.1 Authentication & session

| ID | Requirement | Validation |
|----|-------------|------------|
| FR-AUTH-01 | Supabase session on non-public routes | Redirect `/login` |
| FR-AUTH-02 | GitHub OAuth via `signIn('github')` | `/api/auth/[...nextauth]` |
| FR-AUTH-03 | Public: `/enterprise`, `/login`, `/setup`, `/approve/*`, `/p/*` | `isPublicPath` |
| FR-AUTH-04 | Rate limit 100 req/min/IP | `429` |

## 6.2 Workspace & multi-tenancy

| ID | Requirement | Validation |
|----|-------------|------------|
| FR-WS-01 | Data scoped by `workspace_id` | RLS |
| FR-WS-02 | Membership via `workspace_members` | Session scope |
| FR-WS-03 | Workspace switcher when SaaS UI on | `isSaasUiEnabled()` |
| FR-WS-04 | Workspace bootstrap when SaaS UI off | OAuth works |

## 6.3 Social publish (003)

| ID | Requirement | Validation |
|----|-------------|------------|
| FR-PUB-01 | Publish FB, IG, LinkedIn, X | Worker + adapters |
| FR-PUB-02 | Encrypted OAuth tokens | `TOKEN_ENCRYPTION_KEY` |
| FR-PUB-03 | Meta gated on App Review | `meta_app_review_status` |
| FR-PUB-04 | TikTok/Snap enum skip | FR-P01 |
| FR-PUB-05 | Calendar schedule + worker | `posts` table |

## 6.4 AI CMO mesh (004)

| ID | Requirement | Validation |
|----|-------------|------------|
| FR-AI-01 | Campaign → 202 + jobId | Poll contract |
| FR-AI-02 | 8 Inngest function groups | `getAllAiCmoInngestFunctions()` |
| FR-AI-03 | Policy tier LOW/MED/HIGH/CRITICAL | `policy-engine.ts` |
| FR-AI-04 | CRITICAL never auto-publishes | Tests + workflow |
| FR-AI-05 | Budget cap blocks campaign | Postman B |
| FR-AI-06 | Cost ledger per campaign | `ai_cmo_cost_ledger` |
| FR-AI-07 | Dify → OpenRouter fallback | Circuit breakers |
| FR-AI-08 | CL-030 frozen workflow/reconciler | Code review |

## 6.5 ABM & attribution (005)

| ID | Requirement | Validation |
|----|-------------|------------|
| FR-ABM-01 | Intent scores per workspace | `account_intent_scores` |
| FR-ABM-02 | Playbook activate → 202 | ABM activate API |
| FR-ABM-03 | Attribution unique per month/channel | Upsert constraint |
| FR-ABM-04 | CRM closed-won webhooks | HubSpot + Salesforce |
| FR-ABM-05 | Executive attribution export | Attribution API |

## 6.6 Enterprise GTM (Sprint 2–3)

| ID | Requirement | Validation |
|----|-------------|------------|
| FR-GTM-01 | `ENABLE_SaaS_UI` hides chrome | Sidebar, tour |
| FR-GTM-02 | `ENABLE_ENTERPRISE_LANDING` gates `/enterprise` | `notFound()` |
| FR-GTM-03 | Inbound public, 5/min/IP | Rate limiter |
| FR-GTM-04 | Required: email, firstName | 400 |
| FR-GTM-05 | Internal leads GET session-only | Auth middleware |
| FR-GTM-06 | Meta Lead Ads HMAC | `X-Hub-Signature-256` |
| FR-GTM-07 | Lead source enum | DB CHECK |
| FR-GTM-08 | Lead status enum | DB CHECK |

## 6.7 Intelligence (Sprint 7)

| ID | Requirement | Validation |
|----|-------------|------------|
| FR-INT-01 | CSV ≥2 rows | `validateIngestRows` |
| FR-INT-02 | Anomaly &gt;20% swings | `detectAnomalies` |
| FR-INT-03 | Brief via OpenRouter + fallback | `briefing-agent.ts` |
| FR-INT-04 | Weekly Mon 09:00 UTC cron | Inngest |
| FR-INT-05 | Manual POST `/intelligence/brief` | Session |
| FR-INT-06 | Feed chronological merge | GET feed API |
| FR-INT-07 | Writes via `ingest-raw.ts` only | CL-039 |

## 6.8 Compliance & MENA

| ID | Requirement | Validation |
|----|-------------|------------|
| FR-COMP-01 | Compliance profile API | Workspace API |
| FR-COMP-02 | Locales `en-US`, `ar-SA` | Creator agent |
| FR-COMP-03 | Policy per `data_region` | Sprint 16 |

## 6.9 Global business rules

| Rule | Description |
|------|-------------|
| BR-01 | Approval by risk tier, not LLM confidence |
| BR-02 | SoR via reconciler/domain services only |
| BR-03 | `DEMO_ANALYTICS_ENABLED=false` in prod |
| BR-04 | Margin alert &lt;55% (Sprint 6) |
| BR-05 | No self-serve pilot signup |
| BR-06 | Inbound leads → default/first workspace |
