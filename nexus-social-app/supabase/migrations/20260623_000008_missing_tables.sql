-- Missing tables: user_notifications, workspace_invites, custom_reports
-- Source: src/sql/schema_patch.sql (sprint12 competitive gaps)

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
