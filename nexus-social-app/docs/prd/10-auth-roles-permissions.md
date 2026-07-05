# 10. Authorization, Roles & Permissions

← [PRD Index](./README.md) · [15 Data & Privacy](./15-data-privacy.md)

---

## 10.1 Authentication layers

| Layer | Mechanism | Scope |
|-------|-----------|-------|
| Primary session | Supabase `createServerClient` | App routes |
| Social OAuth | `/api/oauth/{platform}/*` | Publish |
| NextAuth | GitHub provider | Sign-in |
| API key | Workspace keys | Campaign API |
| Service role | `SUPABASE_SERVICE_ROLE_KEY` | Scripts, webhooks, inbound |
| Admin secret | `x-admin-secret` | **Planned** Sprint 6 `/admin` |

---

## 10.2 Workspace roles

| Role | Capabilities | Restrictions |
|------|--------------|--------------|
| **owner** | Full access; billing | No assign-owner via invite UI |
| **admin** | Invite, role change, export | No ownership transfer |
| **member** | Standard operator | No role/export changes |

**Enforcement:** `src/actions/team-management.ts`

---

## 10.3 RLS data visibility

| Scope | Rule |
|-------|------|
| Tenant tables | `workspace_id IN (SELECT … workspace_members … auth.uid())` |
| Service role | Bypass for webhooks/scripts |
| Public inbound leads | `supabaseAdmin` insert — no session |
| Cross-tenant | **Blocked** — release gate |

---

## 10.4 Agency roles (NOT active)

| Role | Status |
|------|--------|
| `tenant_admin` | `000014` draft only |
| `agency_admin` | Not applied |
| `workspace_operator` | Not applied |

Blocked by **A-GATE-003**.

---

## 10.5 Security constraints

| Control | Implementation |
|---------|----------------|
| CSP | Middleware `default-src 'self'` |
| HSTS | 2-year max-age |
| Webhook HMAC | Chatwoot, Meta, HubSpot |
| Token encryption | OAuth at rest |
| E2E bypass | `x-e2e-test` — non-prod only |

---

*See also: [06 Functional Requirements](./06-functional-requirements.md) FR-AUTH-*
