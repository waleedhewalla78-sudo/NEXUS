# Phase 8 — FinOps Framework

**Date:** 2026-06-23 · **PRD Module:** E · **Existing:** `ai_cmo_cost_ledger`, `ai_cmo_cost_summary` MV (000012), `ai_credit_ledger` (003)

---

## Objectives

1. **Track** every token/API call per workspace, campaign, agent  
2. **Enforce** budget caps before workflow execution  
3. **Alert** at thresholds (50%, 80%, 95%, 100%)  
4. **Report** cost per lead, cost per asset, ROI vs `ai_cmo_campaign_outcomes`  
5. **Unify** 003 credits and 004 USD ledger for customer-facing billing  

---

## Table Inventory

### Exists (000012)

**`ai_cmo_cost_ledger`**

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| workspace_id | UUID | FK |
| campaign_id | UUID | FK nullable |
| agent_name | TEXT | brain, creator, optimizer, judge, … |
| cost_category | TEXT | tokens, api_calls, storage, compute |
| amount_usd | DECIMAL(10,4) | |
| token_count | INT | |
| model_used | TEXT | |
| metadata | JSONB | request id, step name |
| recorded_at | TIMESTAMPTZ | |

**`ai_cmo_cost_summary`** — materialized view (daily rollup by workspace, agent)

### Exists (003)

**`ai_credit_ledger`** — credit-based billing for AI features (different unit)

### Proposed new tables (Migration 000013)

**`ai_cmo_token_usage`** — raw per-request log (high volume, partitionable)

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| workspace_id | UUID | FK |
| campaign_id | UUID | nullable |
| workflow_run_id | TEXT | Inngest run ID |
| agent_name | TEXT | |
| model | TEXT | |
| prompt_tokens | INT | |
| completion_tokens | INT | |
| total_tokens | INT | |
| cost_usd | DECIMAL(10,6) | |
| latency_ms | INT | |
| created_at | TIMESTAMPTZ | |

Retention: 30 days hot → aggregate to cost_ledger → purge.

**`ai_cmo_budget_policies`** — caps and alerts

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| workspace_id | UUID | FK (nullable for tenant-level) |
| tenant_id | UUID | FK nullable |
| scope | TEXT | workspace, tenant, campaign |
| scope_id | UUID | nullable |
| period | TEXT | daily, monthly |
| cap_usd | DECIMAL(12,2) | Hard cap |
| warn_thresholds | FLOAT[] | e.g. {0.5, 0.8, 0.95} |
| action_on_cap | TEXT | block, require_approval, notify_only |
| created_at | TIMESTAMPTZ | |

**`ai_cmo_cost_tracking`** — denormalized snapshot for dashboard (optional MV)

| Column | Type | Notes |
|--------|------|-------|
| workspace_id | UUID | |
| period_start | DATE | |
| period_end | DATE | |
| total_usd | DECIMAL | |
| total_tokens | BIGINT | |
| asset_count | INT | |
| cost_per_asset | DECIMAL | Generated |

---

## Cost Capture Points

| Capture point | Layer | Data |
|---------------|-------|------|
| Dify response | L6 wrapper | tokens from API response |
| OpenRouter response | L6 wrapper | usage block |
| LLM-as-Judge | L6 eval job | tokens |
| Qdrant upsert | L8 | storage/compute category |
| Inngest step | L3 | compute category (minimal) |

**Middleware pattern:** `withAgentCostTracking(agentFn)` → writes `token_usage` + `cost_ledger` atomically.

---

## Budget Enforcement Flow

```text
Inngest campaign-workflow START
        │
        ▼
checkBudget(workspaceId, estimatedCost)
        │
        ├── OVER CAP + action=block ──► fail workflow, emit alert
        ├── OVER CAP + action=require_approval ──► approval queue
        ├── WARN threshold ──► notify + continue
        └── OK ──► proceed
        │
        ▼ (each agent step)
recordActualCost(...)
        │
        ▼
reconcileBudgetRollup() ──► trigger marketing.budget.threshold_hit if ≥90%
```

**Current gap:** No runtime writes to `ai_cmo_cost_ledger`; no budget_policies table.

---

## Caps & Alerts

| Level | Default monthly cap | Warn | Hard block |
|-------|---------------------|------|------------|
| Free workspace | $10 | 80% | 100% |
| Professional | $100 | 50, 80, 95% | 100% |
| Agency tenant | $2,000 | custom | configurable |
| Enterprise | Custom | custom | notify_only option |

**100k assets/month scale assumption:** ~500 workspaces @ 200 assets → avg $0.05/asset → ~$10/workspace/month LLM cost. Agency roll-ups require **tenant-level** policies.

---

## Event Integration

| Event | Producer | Action |
|-------|----------|--------|
| `marketing.budget.threshold_hit` | FinOps checker | Event consumer → pause/replan (existing stub) |
| `finops.cap.blocked` | Budget middleware | L1 notification |
| Stripe usage (003) | Optional | Map USD ledger → credit deduction |

---

## Unified Reporting View (Proposed MV)

**`ai_cmo_unified_cost_view`**

| Source | Field |
|--------|-------|
| ai_cmo_cost_ledger | amount_usd, agent_name |
| ai_credit_ledger | credits_consumed → USD equiv |
| ai_cmo_campaign_outcomes | revenue_attributed, cost |

Enables **cost per lead** = SUM(cost) / SUM(leads_generated) per campaign.

---

## FinOps Metrics (AI Ops Dashboard)

| Metric | Formula |
|--------|---------|
| Cost per asset | SUM(cost_ledger) / COUNT(content_pieces) |
| Cost per lead | SUM(cost) / SUM(leads) |
| Token efficiency | conversions / 1M tokens |
| Budget utilization | spend / cap |
| Agent cost mix | GROUP BY agent_name |

---

## Implementation Phases

| Phase | Deliverable |
|-------|-------------|
| D1 | Migration 000013 budget_policies + token_usage |
| D2 | Agent cost middleware + ledger writes |
| D3 | Pre-flight budget check in Inngest |
| D4 | MV refresh + unified view |
| D5 | FinOps dashboard UI (Sprint 17) |

---

## Leadership Note

FinOps at 5,000 workspaces **requires** hard caps before Sprint 14 scales agent usage. Schema-only FinOps is insufficient.
