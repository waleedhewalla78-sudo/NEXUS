# 13. Technical Architecture

← [PRD Index](./README.md) · [12 Integrations](./12-integration-requirements.md)

---

## 13.1 System overview

```text
Browser
   │ HTTPS
Next.js 16 (nexus-social-prod)
   ├── Middleware (auth, CORS, rate limit, CSP)
   ├── API routes
   └── React UI (Tailwind)
        ├── Supabase (SoR + RLS)
        ├── Redis (Streams, heartbeat)
        ├── Inngest (8+ functions)
        ├── worker.ts (publish, analytics)
        ├── Qdrant (vectors)
        └── Dify / OpenRouter
```

---

## 13.2 Technology stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React, Tailwind, next-intl |
| API | Route Handlers, Server Actions |
| Auth | Supabase + NextAuth (GitHub) |
| Database | Supabase PostgreSQL |
| Jobs | Inngest + Redis bridge |
| AI | Dify, OpenRouter, Ollama (dev) |
| Vector | Qdrant |
| Queue | Redis (ioredis) |
| Tests | Vitest, Playwright, k6 |
| CI/CD | GitHub Actions → GHCR |
| Deploy | Docker Compose, Hostinger VPS |

---

## 13.3 Data model summary

| Domain | Tables |
|--------|--------|
| Tenancy | `workspaces`, `workspace_members`, `tenants` |
| Social | `posts`, `workspace_social_connections` |
| AI CMO | `ai_cmo_campaigns`, `ai_cmo_content_pieces`, `ai_cmo_cost_ledger` |
| ABM | `account_intent_scores`, `abm_playbook_runs` |
| CRM | `crm_activity_mirror` |
| Attribution | `attribution_reports` |
| Enterprise | `enterprise_leads` |
| Intelligence | `intelligence_ingests`, `intelligence_briefs` |
| Governance | `audit_logs`, approvals |
| Agency (draft) | `000014` — not applied |

---

## 13.4 Infrastructure

| Component | Spec |
|-----------|------|
| VPS | Hostinger, 8GB RAM |
| Image | `ghcr.io/waleedhewalla78-sudo/nexus-social-app:latest` |
| Container | `nexus-social-prod` |
| Port | `127.0.0.1:3000:3000` |
| Env | `/opt/platform/.env.production` |

**Note:** Standalone image does not include `scripts/` — run maintenance CLIs on VPS host from git clone.

---

## 13.5 Security

| Control | Status |
|---------|--------|
| RLS | ✅ |
| Encrypted tokens | ✅ |
| SSRF-safe outbound | ✅ |
| Webhook signatures | ✅ |
| `verifyEnv()` fail-fast | ✅ |
| Pentest | Deferred S17 |

---

## 13.6 Scalability

| Target | 5k workspaces, 500 agencies, 99.9% uptime |
|--------|-------------------------------------------|
| Bottleneck | 8GB VPS, single container |
| Mitigation | Circuit breakers (Sprint 16) |

---

## 13.7 Architectural principles

| Principle | Rule |
|-----------|------|
| SoR / SoI | Reconciler-only SoR writes |
| Dify | Runtime only — not orchestrator |
| Events | Redis Streams + worker |
| Multi-tenant | RLS mandatory |
| CL-030 | Frozen workflow/reconciler |

*Authority: [CONSTITUTION.md](../../CONSTITUTION.md)*
