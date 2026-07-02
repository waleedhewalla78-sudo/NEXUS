-- RUN_IN_SQL_EDITOR_LAUNCH.sql (one-shot, idempotent)
-- Paste in Supabase SQL Editor for project lnlzxaqockpjezxskmnb

-- From 20260623_000009_migration_status.sql
CREATE TABLE IF NOT EXISTS migration_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  source_system TEXT NOT NULL CHECK (source_system IN ('sprout', 'hootsuite', 'buffer')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  total_records INTEGER NOT NULL DEFAULT 0,
  processed_records INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS migration_status_pending_idx
  ON migration_status (status, created_at)
  WHERE status = 'pending';

ALTER TABLE migration_status ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Members manage migration status" ON migration_status
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM workspace_members wm
        WHERE wm.workspace_id = migration_status.workspace_id
          AND wm.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- From 20260623_000010_meta_app_review.sql
ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS meta_app_review_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (meta_app_review_status IN ('pending', 'approved', 'rejected'));

COMMENT ON COLUMN workspaces.meta_app_review_status IS
  'Business gate: Facebook/Instagram publish blocked until manually set to approved after Meta App Review.';

NOTIFY pgrst, 'reload schema';
