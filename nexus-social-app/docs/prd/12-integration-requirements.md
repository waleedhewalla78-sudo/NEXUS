# 12. Integration Requirements

← [PRD Index](./README.md) · [13 Technical Architecture](./13-technical-architecture.md)

---

## 12.1 API catalog

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/health` | GET | Public | Liveness |
| `/api/v1/enterprise/leads/inbound` | POST | Public (rate limited) | Lead capture |
| `/api/v1/enterprise/leads` | GET | Session | List leads |
| `/api/v1/enterprise/leads/meta-ads` | GET/POST | HMAC | Meta Lead Ads |
| `/api/v1/intelligence/ingest` | POST | Session | CSV/JSON |
| `/api/v1/intelligence/feed` | GET | Session | Unified feed |
| `/api/v1/intelligence/brief` | POST | Session | Manual brief |
| `/api/v1/ai-cmo/campaigns/brief` | POST | Session/API key | Start campaign |
| `/api/v1/ai-cmo/campaigns/jobs/{jobId}` | GET | Session | Poll job |
| `/api/v1/ai-cmo/abm/accounts` | GET | Session | ABM list |
| `/api/v1/ai-cmo/abm/accounts/{id}/activate` | POST | Session | Playbook |
| `/api/v1/ai-cmo/attribution` | GET | Session | Attribution |
| `/api/oauth/linkedin/*` | GET | OAuth | LinkedIn |
| `/api/oauth/hubspot/*` | GET | OAuth | HubSpot |
| `/api/oauth/meta/*` | GET | OAuth | Meta |
| `/api/integrations/crm/webhook/hubspot` | POST | HMAC | CRM |
| `/api/integrations/crm/webhook/salesforce` | POST | Signature | CRM |
| `/api/webhooks/chatwoot-ai` | POST | HMAC | Inbox AI |
| `/api/webhooks/stripe` | POST | Stripe sig | Billing |
| `/api/inngest` | GET/POST | Inngest signing | Jobs |
| `/api/auth/[...nextauth]` | * | NextAuth | GitHub sign-in |

---

## 12.2 External systems

| System | Direction | Auth |
|--------|-----------|------|
| Supabase | Bi-directional | Service + anon |
| Redis | Bi-directional | `REDIS_URL` |
| Inngest | Inbound | Signing keys |
| Dify | Outbound | Workspace keys |
| OpenRouter | Outbound | API key |
| LinkedIn / Meta / X | OAuth + API | OAuth 2.0 |
| HubSpot / Salesforce | Webhook + API | OAuth / secret |
| Chatwoot | Webhook | HMAC |
| Stripe | Webhook | Signature |
| GitHub | OAuth | NextAuth |
| GHCR | Pull | PAT |

---

## 12.3 Data flows

**Campaign → attribution:**
```text
Brief → Inngest → Policy → Content → Approval → Publish → Analytics
  → CRM closed-won → Attribution → UI
```

**Intelligence funnel:**
```text
CSV → ingest API → intelligence_ingests → briefing → intelligence_briefs → /intelligence
```

---

## 12.4 Performance

| Area | Requirement |
|------|-------------|
| Campaign API | 202 immediately; poll 2–5s |
| Inbound leads | 5/min/IP |
| Middleware | 100/min/IP |
| k6 smoke | &lt;5% fail |
| Docker RAM | 3GB limit |
| LLM | Circuit breaker → fallback |

---

## 12.5 LinkedIn production config

Redirect URI (exact): `https://nexussocial.tech/api/oauth/linkedin/callback`
