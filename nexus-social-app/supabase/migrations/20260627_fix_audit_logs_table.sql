-- Feature 004 / UAT — audit_logs table (append-only, workspace-isolated RLS)
-- Safe to re-run (IF NOT EXISTS). Paste in Supabase SQL Editor if psql unavailable.
-- Canonical writer: src/lib/audit.ts (actor_id + metadata)

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_workspace_created
  ON audit_logs (workspace_id, created_at DESC);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY workspace_isolation ON audit_logs FOR ALL
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
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY service_role_audit_logs ON audit_logs FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

NOTIFY pgrst, 'reload schema';
