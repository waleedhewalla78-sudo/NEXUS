-- Feature 004 Phase 2/3/4/6 — Sprint 14 extensions (Migration 000013)
-- Validated against src/lib/db/schemas/ai-cmo-phase-2.ts
-- ADDITIVE ONLY — requires 000012 (ai_cmo foundation) applied first.
-- Creates: decision ledger, agent decisions, experiments, memory summaries,
--          budget policies, approval queue, evaluation extensions, MV refresh RPC.

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
-- Phase 2: Memory summaries (TS mirror: AiCmoMemorySummaryRow)
-- =============================================================================

CREATE TABLE IF NOT EXISTS ai_cmo_memory_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
  summary_period TEXT NOT NULL CHECK (summary_period IN ('weekly', 'monthly')),
  summary_text TEXT NOT NULL,
  learning_ids UUID[] NOT NULL DEFAULT '{}',
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_cmo_memory_summaries_workspace
  ON ai_cmo_memory_summaries(workspace_id, summary_period, updated_at DESC);

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
-- RLS — workspace member isolation
-- =============================================================================

ALTER TABLE ai_cmo_decision_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_cmo_agent_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_cmo_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_cmo_memory_summaries ENABLE ROW LEVEL SECURITY;
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
  CREATE POLICY "Members manage ai_cmo_memory_summaries" ON ai_cmo_memory_summaries FOR ALL USING (
    public.is_workspace_member(auth.uid(), workspace_id)
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Members manage ai_cmo_budget_policies" ON ai_cmo_budget_policies FOR ALL USING (
    workspace_id IS NULL OR public.is_workspace_member(auth.uid(), workspace_id)
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================================================================
-- Phase E: Human approval queue
-- =============================================================================

CREATE TABLE IF NOT EXISTS ai_cmo_approval_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES ai_cmo_campaigns(id) ON DELETE CASCADE,
  content_id UUID REFERENCES ai_cmo_content_pieces(id) ON DELETE SET NULL,
  severity TEXT NOT NULL CHECK (severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  reason TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  assignee_user_id UUID,
  sla_due_at TIMESTAMPTZ,
  decided_at TIMESTAMPTZ,
  decided_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_cmo_approval_requests_workspace
  ON ai_cmo_approval_requests(workspace_id, status, created_at);

ALTER TABLE ai_cmo_approval_requests ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Members manage ai_cmo_approval_requests" ON ai_cmo_approval_requests FOR ALL USING (
    public.is_workspace_member(auth.uid(), workspace_id)
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================================================================
-- Phase D: MV refresh RPC (used by src/jobs/ai-cmo/refresh-mvs.ts)
-- =============================================================================

CREATE OR REPLACE FUNCTION refresh_ai_cmo_materialized_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY ai_cmo_cost_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY ai_cmo_attribution_summary;
  EXCEPTION WHEN OTHERS THEN
    REFRESH MATERIALIZED VIEW ai_cmo_cost_summary;
    REFRESH MATERIALIZED VIEW ai_cmo_attribution_summary;
  END;
END;
$$;

NOTIFY pgrst, 'reload schema';
