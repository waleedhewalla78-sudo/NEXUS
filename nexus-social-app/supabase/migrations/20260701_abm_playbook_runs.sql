-- ABM playbook activation audit trail (Feature 005 Sprint 18)
-- Idempotent apply: safe in SQL Editor

CREATE TABLE IF NOT EXISTS abm_playbook_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  account_intent_id UUID NOT NULL REFERENCES account_intent_scores(id) ON DELETE CASCADE,
  campaign_job_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing'
    CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  objective_preview TEXT NOT NULL DEFAULT '',
  triggered_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_abm_playbook_runs_workspace
  ON abm_playbook_runs (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_abm_playbook_runs_account
  ON abm_playbook_runs (account_intent_id);

ALTER TABLE abm_playbook_runs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY workspace_isolation_abm_playbook ON abm_playbook_runs FOR ALL
    USING (
      workspace_id IN (
        SELECT wm.workspace_id FROM workspace_members wm WHERE wm.user_id = auth.uid()
      )
    )
    WITH CHECK (
      workspace_id IN (
        SELECT wm.workspace_id FROM workspace_members wm WHERE wm.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY service_role_abm_playbook ON abm_playbook_runs FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

NOTIFY pgrst, 'reload schema';
