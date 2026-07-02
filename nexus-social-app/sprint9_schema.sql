-- sprint9_schema.sql

-- =========================================================================
-- 1. PUBLIC API & WEBHOOKS
-- =========================================================================

CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  scopes JSONB NOT NULL DEFAULT '["read:posts"]',
  rate_limit_tier INT DEFAULT 100, -- requests per minute
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage api keys"
ON api_keys FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_members.workspace_id = api_keys.workspace_id 
    AND workspace_members.user_id = auth.uid()
    AND workspace_members.role = 'admin'
  )
);

CREATE TABLE webhook_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  events JSONB NOT NULL DEFAULT '["post.published"]',
  secret TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE webhook_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage webhooks"
ON webhook_subscriptions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_members.workspace_id = webhook_subscriptions.workspace_id 
    AND workspace_members.user_id = auth.uid()
    AND workspace_members.role = 'admin'
  )
);

-- =========================================================================
-- 2. CUSTOM REPORTS
-- =========================================================================

CREATE TABLE custom_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  layout JSONB NOT NULL DEFAULT '[]', -- react-grid-layout config
  schedule TEXT, -- cron expression
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE custom_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can manage custom reports"
ON custom_reports FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_members.workspace_id = custom_reports.workspace_id 
    AND workspace_members.user_id = auth.uid()
  )
);
