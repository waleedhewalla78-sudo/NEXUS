-- =============================================================================
-- UAT blockers — paste ONCE in Supabase SQL Editor (project lnlzxaqockpjezxskmnb)
-- Fixes: api_keys, ai_cmo_budget_policies, ai_cmo_external_signals, ai_cmo_failed_jobs
--        + ai_cmo_evaluations columns (auto_rejected, etc.) for evaluate step
-- Safe to re-run (IF NOT EXISTS / duplicate_object guards)
-- After run: NOTIFY reloads PostgREST schema cache
-- Verify: npm run uat:check-schema  (expect ai_cmo_evaluations.auto_rejected: OK)
-- =============================================================================

-- --- api_keys (campaign API auth) ---
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  scopes JSONB NOT NULL DEFAULT '["read:posts"]'::jsonb,
  rate_limit_tier INT DEFAULT 100,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Admins can manage api keys" ON api_keys FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = api_keys.workspace_id
        AND workspace_members.user_id = auth.uid()
        AND workspace_members.role IN ('owner', 'admin')
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- --- FinOps budget policies (Postman Test B) ---
CREATE TABLE IF NOT EXISTS ai_cmo_budget_policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  tenant_id UUID,
  scope TEXT NOT NULL CHECK (scope IN ('workspace', 'tenant', 'campaign')),
  scope_id UUID,
  period TEXT NOT NULL CHECK (period IN ('daily', 'monthly')),
  cap_usd DECIMAL(12, 2) NOT NULL,
  warn_thresholds FLOAT[] DEFAULT ARRAY[0.5, 0.8, 0.95],
  action_on_cap TEXT NOT NULL DEFAULT 'block'
    CHECK (action_on_cap IN ('block', 'require_approval', 'notify_only')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ai_cmo_budget_policies ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Members manage ai_cmo_budget_policies" ON ai_cmo_budget_policies FOR ALL USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- --- Migration 000015 (Enterprise GA) ---
CREATE TABLE IF NOT EXISTS ai_cmo_external_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  signal_id TEXT NOT NULL,
  source TEXT NOT NULL,
  headline TEXT NOT NULL,
  summary TEXT,
  relevance_score NUMERIC(5,4) CHECK (relevance_score >= 0 AND relevance_score <= 1),
  recommended_action TEXT,
  topics JSONB DEFAULT '[]'::jsonb,
  raw_payload JSONB DEFAULT '{}'::jsonb,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, signal_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_cmo_external_signals_workspace
  ON ai_cmo_external_signals (workspace_id, detected_at DESC);

ALTER TABLE ai_cmo_external_signals ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY ai_cmo_external_signals_workspace_select ON ai_cmo_external_signals
    FOR SELECT USING (
      workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS ai_cmo_failed_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  job_id TEXT,
  inngest_run_id TEXT,
  function_id TEXT NOT NULL,
  failed_step TEXT,
  error_message TEXT NOT NULL,
  error_class TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  langfuse_trace_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_cmo_failed_jobs_workspace
  ON ai_cmo_failed_jobs (workspace_id, created_at DESC);

ALTER TABLE ai_cmo_failed_jobs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY ai_cmo_failed_jobs_service ON ai_cmo_failed_jobs
    FOR ALL USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- --- Migration 000013 evaluation columns (evaluate step persist) ---
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

ALTER TABLE ai_cmo_campaigns ADD COLUMN IF NOT EXISTS calibrated_confidence FLOAT
  CHECK (calibrated_confidence IS NULL OR (calibrated_confidence >= 0 AND calibrated_confidence <= 1));

-- NOTIFY PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

-- --- Optional: ensure walkthrough workspace has at least one member for API workflows ---
-- If live integration fails with "not a member of this workspace", run seed-walkthrough-data.ts
-- or ensure workspace_members has a row for workspace 11111111-1111-1111-1111-111111111111.
