-- sprint8_custom_domains.sql

CREATE TABLE custom_domains (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  domain TEXT NOT NULL UNIQUE,
  ssl_status TEXT DEFAULT 'pending', -- 'pending', 'active', 'failed'
  verification_token TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE custom_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their custom domains"
ON custom_domains FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_members.workspace_id = custom_domains.workspace_id 
    AND workspace_members.user_id = auth.uid()
  )
);
