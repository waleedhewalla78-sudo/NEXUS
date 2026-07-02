-- Task 1: Supabase Schema for AI Agent Configuration & Conversation Logs

CREATE TABLE IF NOT EXISTS ai_agent_configs (
  workspace_id UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  dify_app_id TEXT NOT NULL,
  dify_dataset_id TEXT NOT NULL,
  persona_name TEXT DEFAULT 'Support Agent',
  system_prompt_override TEXT,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE ai_agent_configs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only select/insert/update configs for workspaces they belong to
CREATE POLICY "Users can manage ai_agent_configs for their workspaces" ON ai_agent_configs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = ai_agent_configs.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

CREATE TABLE IF NOT EXISTS ai_conversation_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  channel TEXT NOT NULL, -- 'web', 'whatsapp', 'email', etc.
  external_conversation_id TEXT, -- Maps to Chatwoot conversation ID
  user_query TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  confidence_score FLOAT,
  tokens_used INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE ai_conversation_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view/insert logs for their workspaces
CREATE POLICY "Users can access ai_conversation_logs for their workspaces" ON ai_conversation_logs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = ai_conversation_logs.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );
