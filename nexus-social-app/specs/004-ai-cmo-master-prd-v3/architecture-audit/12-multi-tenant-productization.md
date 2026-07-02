# Phase 11 — Multi-Tenant Productization

**Date:** 2026-06-23 · **PRD Module:** K · **Migration:** 000011 hierarchy (partial)

---

## Target Hierarchy

```text
Tenant (billing entity, data region, plan)
  └── Agency (optional — reseller / marketing agency)
        └── Client Brand (end customer brand)
              └── Workspace (operational unit — existing)
                    └── Campaign (ai_cmo_campaigns)
                          └── Content pieces / Posts
```

**PRD v3 stated:** Tenant → Workspace → Brand → Campaign  
**Audit correction:** Insert **Agency** and rename conceptual "Brand" to **Client Brand** for 500-agency scale.

---

## Current Schema (000011)

| Entity | Table | Notes |
|--------|-------|-------|
| Tenant | `tenants` | id, name, slug, plan_type |
| Workspace | `workspaces` | + `tenant_id` FK (backfilled) |
| Brand | `brands` | workspace_id FK — **client brand today** |
| Campaign | `ai_cmo_campaigns` | workspace_id, brand_id |

**Missing:** `agencies` table, agency→brand mapping, tenant-level billing aggregation, white-label per agency.

---

## Leadership Decision: Agency Hierarchy Migration

### Option A — Extend `tenants` with `type` enum

| Pros | Cons |
|------|------|
| No new table | Conflates end-customer and agency |
| Minimal migration | 500 agencies × many clients = messy |

### Option B — New `agencies` table (Recommended)

| Pros | Cons |
|------|------|
| Clear billing isolation | Migration + backfill |
| Agency admin role | UI work Sprint 17 |
| White-label per agency | |

**Recommendation:** **Option B** — new `agencies` table.

---

## Proposed Schema (Migration 000014)

**`agencies`**

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| tenant_id | UUID | FK tenants — agency belongs to platform tenant |
| name | TEXT | |
| slug | TEXT | UNIQUE per tenant |
| white_label_config | JSONB | logo, colors, domain |
| billing_stripe_customer_id | TEXT | Agency-level billing |
| created_at | TIMESTAMPTZ | |

**`brands` extension**

| Column | Type | Notes |
|--------|------|-------|
| agency_id | UUID | FK agencies nullable (direct brands omit) |

**`workspaces` extension**

| Column | Type | Notes |
|--------|------|-------|
| agency_id | UUID | FK nullable — roll-up reporting |

---

## Isolation Model

| Boundary | Mechanism |
|----------|-----------|
| Workspace data | RLS `is_workspace_member` (unchanged — primary) |
| Brand data | workspace_id FK + brand.agency_id consistency check |
| Agency roll-up | Agency admin role → read-only aggregate via RPC (no cross-workspace write) |
| Tenant roll-up | Service role + tenant_id filter for platform ops |
| AI assets | All ai_cmo_* scoped by workspace_id |

**Cross-tenant leak prevention:** Reconciler validates `brand.workspace_id === campaign.workspace_id`; add `brand.agency_id === workspace.agency_id` when agency_id set.

---

## White-Label

| Surface | Config source |
|---------|---------------|
| AI CMO dashboard | `agencies.white_label_config` or `tenants` fallback |
| Explainability labels | Agency name, not "Nexus" |
| Email notifications | Agency logo (future) |
| AI outputs | Creator system prompt: client brand name from `brands.name` |

**Current gap:** Hardcoded/generic labels in explainability renderer.

---

## Billing

| Model | Implementation |
|-------|----------------|
| Platform → Agency | Stripe customer on `agencies.billing_stripe_customer_id` |
| Usage metering | Sum `ai_cmo_cost_ledger` by agency roll-up MV |
| Credits (003) | Map workspace credits → agency invoice line items |
| Budget caps | `budget_policies` at agency scope (doc 09) |

**Proposed MV:** `ai_cmo_agency_cost_summary` GROUP BY agency_id, date.

---

## Plan Types (tenants.plan_type)

| Plan | Workspaces | Agencies | AI cap/month |
|------|------------|----------|--------------|
| free | 1 | 0 | $10 |
| professional | 3 | 0 | $100 |
| agency | 50 | 5 | $2,000 |
| enterprise | unlimited | unlimited | custom |

Enforce at L2 API + FinOps pre-flight.

---

## UI Requirements (Sprint 17)

| Screen | Purpose |
|--------|---------|
| Tenant settings | Plan, data region, billing |
| Agency list | CRUD agencies (agency plan+) |
| Client brand picker | Assign brand to campaign |
| Workspace switcher | Existing — add agency grouping |
| Agency dashboard | Cross-client ROI (read-only) |

**Current:** DB-only hierarchy — no UI.

---

## Migration Backfill Strategy

1. Create `agencies` table  
2. For each `tenants.plan_type = 'agency'`, create default agency  
3. Set `brands.agency_id` and `workspaces.agency_id` from default  
4. Non-agency tenants: leave agency_id NULL  
5. Zero downtime — nullable FKs first, enforce NOT NULL for new rows only  

**Risk R7 (analysis.md):** Cross-tenant RLS via brands — add integration tests post-migration.

---

## 5,000 Workspace Scale Considerations

| Concern | Approach |
|---------|------------|
| Tenant count | ~200 tenants × 25 workspaces avg OR 500 agencies × 10 clients |
| Index strategy | agency_id, tenant_id on workspaces, brands |
| Reporting | Pre-aggregated MVs; avoid cross-workspace JOIN in hot path |
| Onboarding | API: create agency → brand → workspace in one transaction |

See [16-production-readiness-assessment.md](./16-production-readiness-assessment.md).
