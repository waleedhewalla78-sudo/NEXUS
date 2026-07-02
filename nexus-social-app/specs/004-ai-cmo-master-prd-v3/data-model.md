# Data Model — AI CMO PRD v3.0

All tables use Supabase RLS scoped via `workspace_members` (and tenant cascade where noted). Migrations live under `supabase/migrations/`.

---

## Productization Hierarchy (Sprint 12 Task 1)

### `tenants`

```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  plan_type TEXT CHECK (plan_type IN ('free', 'professional', 'agency', 'enterprise')) NOT NULL DEFAULT 'professional',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### `workspaces` (extension)

```sql
ALTER TABLE workspaces ADD COLUMN tenant_id UUID REFERENCES tenants(id);
```

Existing workspaces receive a default tenant per workspace during migration (no data loss).

### `brands`

```sql
CREATE TABLE brands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  brand_voice_config JSONB DEFAULT '{}'::jsonb,
  logo_url TEXT,
  primary_color TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (workspace_id, slug)
);
```

### `ai_cmo_campaigns`

No legacy `campaigns` table exists in Feature 003; campaigns are introduced as `ai_cmo_campaigns`.

```sql
CREATE TABLE ai_cmo_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'planning', 'active', 'paused', 'completed', 'archived')),
  objective JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Memory Layer (Sprint 12 Task 5)

### `ai_cmo_learnings`

```sql
CREATE TABLE ai_cmo_learnings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  learning_type TEXT CHECK (learning_type IN ('content_pattern', 'timing', 'audience', 'channel', 'tone')) NOT NULL,
  context JSONB NOT NULL,
  action JSONB NOT NULL,
  outcome JSONB NOT NULL,
  roi_impact FLOAT,
  confidence FLOAT CHECK (confidence BETWEEN 0 AND 1),
  validated_by_human BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### `ai_cmo_campaign_outcomes`

```sql
CREATE TABLE ai_cmo_campaign_outcomes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES ai_cmo_campaigns(id) ON DELETE CASCADE,
  impressions INT DEFAULT 0,
  clicks INT DEFAULT 0,
  conversions INT DEFAULT 0,
  leads_generated INT DEFAULT 0,
  revenue_attributed DECIMAL(12,2) DEFAULT 0,
  cost DECIMAL(12,2) DEFAULT 0,
  roi_ratio FLOAT,
  lessons_learned JSONB,
  human_review JSONB,
  measured_at TIMESTAMPTZ DEFAULT now()
);
```

### `ai_cmo_strategy_history`

Requires `ai_cmo_strategies` (Sprint 13+); schema reserved:

```sql
-- ai_cmo_strategies (Sprint 13)
-- ai_cmo_strategy_history references strategy_id
```

---

## FinOps (Sprint 12 Task 6)

### `ai_cmo_cost_ledger`

```sql
CREATE TABLE ai_cmo_cost_ledger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES ai_cmo_campaigns(id),
  agent_name TEXT NOT NULL,
  cost_category TEXT CHECK (cost_category IN ('tokens', 'api_calls', 'storage', 'compute')) NOT NULL,
  amount_usd DECIMAL(10,4) NOT NULL,
  token_count INT,
  model_used TEXT,
  metadata JSONB,
  recorded_at TIMESTAMPTZ DEFAULT now()
);
```

### `ai_cmo_cost_summary` (materialized view)

```sql
CREATE MATERIALIZED VIEW ai_cmo_cost_summary AS
SELECT
  workspace_id,
  date_trunc('day', recorded_at) AS date,
  agent_name,
  SUM(amount_usd) AS total_cost,
  SUM(token_count) AS total_tokens,
  COUNT(*) AS call_count
FROM ai_cmo_cost_ledger
GROUP BY 1, 2, 3;
```

---

## Attribution (Sprint 12 Task 7)

### `ai_cmo_attribution_events`

```sql
CREATE TABLE ai_cmo_attribution_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  visitor_id TEXT NOT NULL,
  campaign_id UUID REFERENCES ai_cmo_campaigns(id),
  agent_name TEXT,
  channel TEXT,
  content_id UUID,
  event_type TEXT CHECK (event_type IN ('page_view', 'click', 'signup', 'demo_request', 'purchase')) NOT NULL,
  utm_params JSONB,
  is_first_touch BOOLEAN DEFAULT false,
  value DECIMAL(12,2),
  occurred_at TIMESTAMPTZ DEFAULT now()
);
```

---

## AI Evaluation (Sprint 12 Task 8)

### `ai_cmo_evaluations`

```sql
CREATE TABLE ai_cmo_evaluations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  content_id UUID NOT NULL,
  evaluator_type TEXT CHECK (evaluator_type IN ('llm_as_judge', 'human', 'automated')) NOT NULL,
  accuracy_score FLOAT CHECK (accuracy_score BETWEEN 0 AND 1),
  localization_score FLOAT CHECK (localization_score BETWEEN 0 AND 1),
  brand_alignment_score FLOAT CHECK (brand_alignment_score BETWEEN 0 AND 1),
  hallucination_flag BOOLEAN DEFAULT false,
  overall_quality_score FLOAT CHECK (overall_quality_score BETWEEN 0 AND 1),
  evaluation_details JSONB,
  evaluated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Decision Ledger (Module W)

### `ai_cmo_decision_ledger`

```sql
CREATE TABLE ai_cmo_decision_ledger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  decision_id UUID NOT NULL,
  agent_name TEXT NOT NULL,
  decision_type TEXT,
  rationale JSONB,
  expected_kpis JSONB,
  actual_kpis JSONB,
  variance JSONB,
  human_override BOOLEAN DEFAULT false,
  lesson_learned TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  measured_at TIMESTAMPTZ
);
```

---

## RLS Pattern

- **tenants:** SELECT if user is member of any workspace with matching `tenant_id`
- **brands / ai_cmo_campaigns / memory / finops / attribution / evaluations / decision_ledger:** standard `is_workspace_member(auth.uid(), workspace_id)`
- **Cross-tenant:** brand `workspace_id` must match campaign `workspace_id`; enforced in app + FK

---

## Implemented Migrations

| Migration | Tables |
|-----------|--------|
| `20260624_000011_ai_cmo_hierarchy.sql` | `tenants`, `brands`, `ai_cmo_campaigns`, `workspaces.tenant_id` |

Remaining Sprint 12 schema tasks (Tasks 5–8) are documented here; migrations pending Task 3+ review gate.
