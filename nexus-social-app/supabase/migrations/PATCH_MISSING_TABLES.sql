-- =============================================================================
-- Nexus Social Platform â€” one-shot patch for missing tables
-- Run in Supabase SQL Editor when verify-schema reports missing:
--   user_notifications, workspace_invites, custom_reports, migration_status
--
-- Safe to re-run: uses IF NOT EXISTS / duplicate_object guards.
-- After running: npm run verify-schema (expect 16/16)
-- =============================================================================

-- === 20260623_000008_missing_tables.sql ===

-- Persistent user notifications
CREATE TABLE IF NOT EXISTS user_notifications (
  id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  href TEXT NOT NULL DEFAULT '/',
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, workspace_id, id)
);

ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users read own notifications" ON user_notifications
    FOR ALL USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Pending team email invites
CREATE TABLE IF NOT EXISTS workspace_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  invited_by UUID REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (workspace_id, email)
);

ALTER TABLE workspace_invites ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Admins manage workspace invites" ON workspace_invites
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM workspace_members wm
        WHERE wm.workspace_id = workspace_invites.workspace_id
          AND wm.user_id = auth.uid()
          AND wm.role IN ('owner', 'admin')
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Custom PDF report layouts
CREATE TABLE IF NOT EXISTS custom_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Default Report',
  layout JSONB NOT NULL DEFAULT '[]'::jsonb,
  schedule TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE custom_reports ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Members manage custom reports" ON custom_reports
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM workspace_members wm
        WHERE wm.workspace_id = custom_reports.workspace_id
          AND wm.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

NOTIFY pgrst, 'reload schema';

-- === 20260623_000009_migration_status.sql ===

-- Enterprise data migration job tracking (worker poller + /settings/migration)
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

NOTIFY pgrst, 'reload schema';

