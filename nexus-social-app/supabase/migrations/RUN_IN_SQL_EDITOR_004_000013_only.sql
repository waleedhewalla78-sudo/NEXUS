-- DRAFT — Sprint 14 Phase C/D/E schema extensions (Feature 004)
-- DO NOT APPLY without leadership sign-off. See specs/004-ai-cmo-master-prd-v3/data-model.md
-- Adds: decision ledger, agent decisions, experiments, budget policies, campaign confidence, eval extensions

-- =============================================================================
-- Module W: Decision ledger
-- =============================================================================

CREATE TABLE IF NOT EXISTS ai_cmo_decision_ledger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  decision_id UUID NOT NULL,
  agent_name TEXT NOT NULL,
  decision_type TEXT,
  rationale JSONB DEFAULT '{}'::jsonb,
  expected_kpis JSONB DEFAULT '{}'::jsonb,
  actual_kpis JSONB DEFAULT '{}'::jsonb,
  variance JSONB DEFAULT '{}'::jsonb,
  human_override BOOLEAN NOT NULL DEFAULT false,
  lesson_learned TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  measured_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ai_cmo_decision_ledger_workspace ON ai_cmo_decision_ledger(workspace_id, created_at);

-- =============================================================================
-- Phase C: Agent decisions + experiments
-- =============================================================================

CREATE TABLE IF NOT EXISTS ai_cmo_agent_decisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES ai_cmo_campaigns(id) ON DELETE SET NULL,
  agent_name TEXT NOT NULL,
  input_hash TEXT NOT NULL,
  input_summary JSONB DEFAULT '{}'::jsonb,
  output JSONB NOT NULL DEFAULT '{}'::jsonb,
  model_used TEXT,
  token_count INT,
  latency_ms INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_cmo_agent_decisions_workspace ON ai_cmo_agent_decisions(workspace_id, created_at);

CREATE TABLE IF NOT EXISTS ai_cmo_experiments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES ai_cmo_campaigns(id) ON DELETE SET NULL,
  experiment_key TEXT NOT NULL,
  variant TEXT NOT NULL,
  hypothesis TEXT,
  metrics JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'running', 'concluded')),
  winner_variant TEXT,
  started_at TIMESTAMPTZ,
  concluded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_cmo_experiments_workspace ON ai_cmo_experiments(workspace_id, status);

-- =============================================================================
-- Phase D: Budget policies (FinOps pre-flight)
-- =============================================================================

CREATE TABLE IF NOT EXISTS ai_cmo_budget_policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK (scope IN ('workspace', 'tenant', 'campaign')),
  scope_id UUID,
  period TEXT NOT NULL CHECK (period IN ('daily', 'monthly')),
  cap_usd DECIMAL(12, 2) NOT NULL,
  warn_thresholds FLOAT[] DEFAULT ARRAY[0.5, 0.8, 0.95],
  action_on_cap TEXT NOT NULL DEFAULT 'block'
    CHECK (action_on_cap IN ('block', 'require_approval', 'notify_only')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- Phase E: Campaign confidence + evaluation extensions
-- =============================================================================

ALTER TABLE ai_cmo_campaigns ADD COLUMN IF NOT EXISTS calibrated_confidence FLOAT
  CHECK (calibrated_confidence IS NULL OR (calibrated_confidence >= 0 AND calibrated_confidence <= 1));

ALTER TABLE ai_cmo_evaluations ADD COLUMN IF NOT EXISTS uniqueness_score FLOAT
  CHECK (uniqueness_score IS NULL OR (uniqueness_score >= 0 AND uniqueness_score <= 1));
ALTER TABLE ai_cmo_evaluations ADD COLUMN IF NOT EXISTS eeat_score FLOAT
  CHECK (eeat_score IS NULL OR (eeat_score >= 0 AND eeat_score <= 1));
ALTER TABLE ai_cmo_evaluations ADD COLUMN IF NOT EXISTS engagement_score FLOAT
  CHECK (engagement_score IS NULL OR (engagement_score >= 0 AND engagement_score <= 1));
ALTER TABLE ai_cmo_evaluations ADD COLUMN IF NOT EXISTS platform_compliance_score FLOAT
  CHECK (platform_compliance_score IS NULL OR (platform_compliance_score >= 0 AND platform_compliance_score <= 1));
ALTER TABLE ai_cmo_evaluations ADD COLUMN IF NOT EXISTS auto_rejected BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE ai_cmo_evaluations ADD COLUMN IF NOT EXISTS rejection_reasons TEXT[] DEFAULT '{}';
ALTER TABLE ai_cmo_evaluations ADD COLUMN IF NOT EXISTS evaluator_model TEXT;
ALTER TABLE ai_cmo_evaluations ADD COLUMN IF NOT EXISTS calibrated_confidence FLOAT
  CHECK (calibrated_confidence IS NULL OR (calibrated_confidence >= 0 AND calibrated_confidence <= 1));

-- =============================================================================
-- RLS (draft — enable when applied)
-- =============================================================================

ALTER TABLE ai_cmo_decision_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_cmo_agent_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_cmo_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_cmo_budget_policies ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Members manage ai_cmo_decision_ledger" ON ai_cmo_decision_ledger FOR ALL USING (
    public.is_workspace_member(auth.uid(), workspace_id)
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Members manage ai_cmo_agent_decisions" ON ai_cmo_agent_decisions FOR ALL USING (
    public.is_workspace_member(auth.uid(), workspace_id)
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Members manage ai_cmo_experiments" ON ai_cmo_experiments FOR ALL USING (
    public.is_workspace_member(auth.uid(), workspace_id)
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Members manage ai_cmo_budget_policies" ON ai_cmo_budget_policies FOR ALL USING (
    workspace_id IS NULL OR public.is_workspace_member(auth.uid(), workspace_id)
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

NOTIFY pgrst, 'reload schema';
