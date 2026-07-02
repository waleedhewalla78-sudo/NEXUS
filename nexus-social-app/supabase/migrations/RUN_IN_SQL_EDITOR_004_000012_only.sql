-- Feature 004 -- paste entire file in Supabase SQL Editor
-- Use when 20260624_000011_ai_cmo_hierarchy.sql is ALREADY applied (schema:verify:004 shows 3/11).
-- Source: supabase/migrations/20260624_000012_ai_cmo_foundation.sql (Sprint 12 T005-T008)
-- Idempotent (IF NOT EXISTS, duplicate_object policies). Ends with NOTIFY pgrst.

-- ========== BEGIN 20260624_000012_ai_cmo_foundation.sql ==========
CREATE TABLE IF NOT EXISTS ai_cmo_strategies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ai_cmo_campaigns ADD COLUMN IF NOT EXISTS post_id UUID REFERENCES posts(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS ai_cmo_content_pieces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES ai_cmo_campaigns(id) ON DELETE SET NULL,
  post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  locale TEXT NOT NULL DEFAULT 'en-US',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_cmo_content_pieces_workspace ON ai_cmo_content_pieces(workspace_id);

-- =============================================================================
-- T005: Memory layer
-- =============================================================================

CREATE TABLE IF NOT EXISTS ai_cmo_learnings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  learning_type TEXT NOT NULL
    CHECK (learning_type IN ('content_pattern', 'timing', 'audience', 'channel', 'tone')),
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  action JSONB NOT NULL DEFAULT '{}'::jsonb,
  outcome JSONB NOT NULL DEFAULT '{}'::jsonb,
  roi_impact FLOAT,
  confidence FLOAT CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  validated_by_human BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_cmo_campaign_outcomes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES ai_cmo_campaigns(id) ON DELETE CASCADE,
  impressions INT NOT NULL DEFAULT 0,
  clicks INT NOT NULL DEFAULT 0,
  conversions INT NOT NULL DEFAULT 0,
  leads_generated INT NOT NULL DEFAULT 0,
  revenue_attributed DECIMAL(12, 2) NOT NULL DEFAULT 0,
  cost DECIMAL(12, 2) NOT NULL DEFAULT 0,
  roi_ratio FLOAT,
  lessons_learned JSONB DEFAULT '{}'::jsonb,
  human_review JSONB DEFAULT '{}'::jsonb,
  measured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_cmo_strategy_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  strategy_id UUID NOT NULL REFERENCES ai_cmo_strategies(id) ON DELETE CASCADE,
  change_type TEXT NOT NULL,
  previous_state JSONB,
  new_state JSONB,
  reason TEXT,
  triggered_by TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- T006: FinOps
-- =============================================================================

CREATE TABLE IF NOT EXISTS ai_cmo_cost_ledger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES ai_cmo_campaigns(id) ON DELETE SET NULL,
  agent_name TEXT NOT NULL,
  cost_category TEXT NOT NULL
    CHECK (cost_category IN ('tokens', 'api_calls', 'storage', 'compute')),
  amount_usd DECIMAL(10, 4) NOT NULL,
  token_count INT,
  model_used TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_cmo_cost_ledger_workspace ON ai_cmo_cost_ledger(workspace_id, recorded_at);

DROP MATERIALIZED VIEW IF EXISTS ai_cmo_cost_summary;

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

-- =============================================================================
-- T007: Attribution
-- =============================================================================

CREATE TABLE IF NOT EXISTS ai_cmo_attribution_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  visitor_id TEXT NOT NULL,
  campaign_id UUID REFERENCES ai_cmo_campaigns(id) ON DELETE SET NULL,
  agent_name TEXT,
  channel TEXT,
  content_id UUID REFERENCES ai_cmo_content_pieces(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL
    CHECK (event_type IN ('page_view', 'click', 'signup', 'demo_request', 'purchase')),
  utm_params JSONB DEFAULT '{}'::jsonb,
  value DECIMAL(12, 2),
  is_first_touch BOOLEAN NOT NULL DEFAULT false,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_cmo_attribution_workspace ON ai_cmo_attribution_events(workspace_id, occurred_at);

DROP MATERIALIZED VIEW IF EXISTS ai_cmo_attribution_summary;

CREATE MATERIALIZED VIEW ai_cmo_attribution_summary AS
SELECT
  workspace_id,
  campaign_id,
  agent_name,
  channel,
  COUNT(DISTINCT visitor_id) FILTER (WHERE event_type = 'signup') AS signups,
  COUNT(DISTINCT visitor_id) FILTER (WHERE event_type = 'demo_request') AS demos,
  SUM(value) FILTER (WHERE event_type = 'purchase') AS revenue,
  COUNT(DISTINCT visitor_id) FILTER (
    WHERE event_type = 'signup' AND is_first_touch = true
  ) AS first_touch_signups
FROM ai_cmo_attribution_events
GROUP BY 1, 2, 3, 4;

-- =============================================================================
-- T008: AI evaluations
-- =============================================================================

CREATE TABLE IF NOT EXISTS ai_cmo_evaluations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES ai_cmo_content_pieces(id) ON DELETE CASCADE,
  evaluator_type TEXT NOT NULL
    CHECK (evaluator_type IN ('llm_as_judge', 'human', 'automated')),
  accuracy_score FLOAT CHECK (accuracy_score IS NULL OR (accuracy_score >= 0 AND accuracy_score <= 1)),
  localization_score FLOAT CHECK (localization_score IS NULL OR (localization_score >= 0 AND localization_score <= 1)),
  brand_alignment_score FLOAT CHECK (brand_alignment_score IS NULL OR (brand_alignment_score >= 0 AND brand_alignment_score <= 1)),
  hallucination_flag BOOLEAN NOT NULL DEFAULT false,
  overall_quality_score FLOAT CHECK (overall_quality_score IS NULL OR (overall_quality_score >= 0 AND overall_quality_score <= 1)),
  evaluation_details JSONB DEFAULT '{}'::jsonb,
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- RLS
-- =============================================================================

ALTER TABLE ai_cmo_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_cmo_content_pieces ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_cmo_learnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_cmo_campaign_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_cmo_strategy_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_cmo_cost_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_cmo_attribution_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_cmo_evaluations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Members manage ai_cmo_strategies" ON ai_cmo_strategies FOR ALL USING (
    public.is_workspace_member(auth.uid(), workspace_id)
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Members manage ai_cmo_content_pieces" ON ai_cmo_content_pieces FOR ALL USING (
    public.is_workspace_member(auth.uid(), workspace_id)
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Members manage ai_cmo_learnings" ON ai_cmo_learnings FOR ALL USING (
    public.is_workspace_member(auth.uid(), workspace_id)
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Members manage ai_cmo_campaign_outcomes" ON ai_cmo_campaign_outcomes FOR ALL USING (
    public.is_workspace_member(auth.uid(), workspace_id)
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Members manage ai_cmo_strategy_history" ON ai_cmo_strategy_history FOR ALL USING (
    public.is_workspace_member(auth.uid(), workspace_id)
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Members manage ai_cmo_cost_ledger" ON ai_cmo_cost_ledger FOR ALL USING (
    public.is_workspace_member(auth.uid(), workspace_id)
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Members manage ai_cmo_attribution_events" ON ai_cmo_attribution_events FOR ALL USING (
    public.is_workspace_member(auth.uid(), workspace_id)
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Members manage ai_cmo_evaluations" ON ai_cmo_evaluations FOR ALL USING (
    public.is_workspace_member(auth.uid(), workspace_id)
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

NOTIFY pgrst, 'reload schema';
