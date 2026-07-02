-- Task 1: Webhook Listener & Inbox Mapping Schema

CREATE TABLE IF NOT EXISTS chatwoot_inbox_workspace_map (
  chatwoot_inbox_id INTEGER PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  ai_bot_user_id INTEGER, -- The Chatwoot user ID representing the AI
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE chatwoot_inbox_workspace_map ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only workspace members (or admins) can view/manage
CREATE POLICY "Users can access mapping for their workspaces" ON chatwoot_inbox_workspace_map
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = chatwoot_inbox_workspace_map.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );
