# Data Model: AI CMO PRD v3.0 (Sprint 12)

## Productization Hierarchy

```
tenants (1) ──< workspaces (N) ──< brands (N)
                                    │
                    ai_cmo_campaigns ──> posts (execution, Feature 003)
                    ai_cmo_content_pieces ──> posts (optional)
```

## Core Tables (Sprint 12)

### tenants

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | TEXT | |
| slug | TEXT UNIQUE | |
| plan_type | TEXT | free, professional, agency, enterprise |
| created_at | TIMESTAMPTZ | |

### brands

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| workspace_id | UUID FK workspaces | |
| name | TEXT | |
| brand_voice_config | JSONB | |
| logo_url | TEXT | |
| primary_color | TEXT | |

### ai_cmo_campaigns

Maps to `posts` for execution (see clarifications CL-003).

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| workspace_id | UUID FK | |
| brand_id | UUID FK brands | |
| post_id | UUID FK posts | Primary scheduled content |
| name | TEXT | |
| objective | TEXT | |
| status | TEXT | draft, active, paused, completed |

### ai_cmo_strategies

Parent for strategy_history.

### Memory Layer

- `ai_cmo_learnings` — learning_type, context, action, outcome, roi_impact, confidence
- `ai_cmo_campaign_outcomes` — campaign metrics, lessons_learned
- `ai_cmo_strategy_history` — change audit for strategies

### FinOps

- `ai_cmo_cost_ledger` — per-agent token/API costs
- `ai_cmo_cost_summary` — materialized view (daily rollup)

### Attribution

- `ai_cmo_attribution_events` — visitor_id, event_type, utm_params, is_first_touch
- `ai_cmo_attribution_summary` — materialized view

### Evaluation

- `ai_cmo_evaluations` — LLM-as-judge scores per content_id

### ai_cmo_content_pieces

Draft/pre-publish content for quality gates and evaluations; optional `post_id` when promoted to SoR.

## RLS Pattern

All `ai_cmo_*` and `brands` tables use:

```sql
EXISTS (
  SELECT 1 FROM workspace_members wm
  WHERE wm.workspace_id = <table>.workspace_id
    AND wm.user_id = auth.uid()
)
```

`tenants` SELECT via workspace membership join.

## Migration File

`nexus-social-app/supabase/migrations/20260624_000011_ai_cmo_hierarchy.sql` + `20260624_000012_ai_cmo_foundation.sql`

Ends with `NOTIFY pgrst, 'reload schema';`
