-- Feature 004 Enterprise GA (Sprints 15–17) — paste into Supabase SQL Editor
-- Project: lnlzxaqockpjezxskmnb
-- File: supabase/migrations/20260626_000015_ai_cmo_enterprise_ga.sql

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
      workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      )
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
