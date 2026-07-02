-- Per-post analytics synced from platform APIs
CREATE TABLE IF NOT EXISTS post_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  external_post_id TEXT NOT NULL,
  impressions BIGINT,
  reach BIGINT,
  clicks BIGINT,
  likes BIGINT,
  comments BIGINT,
  shares BIGINT,
  saves BIGINT,
  engagement_rate NUMERIC(8,4),
  raw_payload JSONB,
  synced_at TIMESTAMPTZ,
  sync_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (post_id, platform, external_post_id)
);

CREATE INDEX IF NOT EXISTS post_analytics_workspace_synced_idx
  ON post_analytics (workspace_id, synced_at DESC);

ALTER TABLE post_analytics ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Members view post analytics" ON post_analytics
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM workspace_members wm
        WHERE wm.workspace_id = post_analytics.workspace_id
          AND wm.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
