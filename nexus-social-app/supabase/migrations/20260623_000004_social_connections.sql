-- OAuth social connections + publish columns on posts
CREATE TABLE IF NOT EXISTS workspace_social_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('facebook', 'instagram', 'linkedin', 'x')),
  account_id TEXT NOT NULL,
  account_name TEXT,
  account_handle TEXT,
  access_token_enc TEXT NOT NULL,
  refresh_token_enc TEXT,
  token_iv TEXT NOT NULL,
  token_tag TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,
  scopes TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'::jsonb,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  disconnected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS workspace_social_connections_active_unique
  ON workspace_social_connections (workspace_id, platform, account_id)
  WHERE disconnected_at IS NULL;

CREATE INDEX IF NOT EXISTS workspace_social_connections_workspace_idx
  ON workspace_social_connections (workspace_id);

CREATE INDEX IF NOT EXISTS workspace_social_connections_expiry_idx
  ON workspace_social_connections (platform, token_expires_at)
  WHERE disconnected_at IS NULL;

ALTER TABLE workspace_social_connections ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Members manage social connections" ON workspace_social_connections
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM workspace_members wm
        WHERE wm.workspace_id = workspace_social_connections.workspace_id
          AND wm.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE posts ADD COLUMN IF NOT EXISTS publish_error TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS external_post_id TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS external_permalink TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS connection_id UUID REFERENCES workspace_social_connections(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS posts_scheduled_publish_idx
  ON posts (scheduled_at)
  WHERE status = 'scheduled';
