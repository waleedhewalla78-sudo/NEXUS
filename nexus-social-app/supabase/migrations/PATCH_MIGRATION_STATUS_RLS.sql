-- Fix "Members manage migration status" if an earlier SQL Editor run applied a malformed policy.
-- Safe to re-run: DROP POLICY IF EXISTS + CREATE POLICY.

DROP POLICY IF EXISTS "Members manage migration status" ON migration_status;

CREATE POLICY "Members manage migration status" ON migration_status
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = migration_status.workspace_id
        AND wm.user_id = auth.uid()
    )
  );
