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
-- Task 1: Database Schema for Support Tickets (Tool Connectivity)

CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  external_conversation_id TEXT, -- Links back to Chatwoot
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
  status TEXT DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view/manage their workspace tickets
CREATE POLICY "Users can access support_tickets for their workspaces" ON support_tickets
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = support_tickets.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );
-- Task 1: Database Schema for QA & Feedback (LLM-as-a-Judge)

CREATE TABLE IF NOT EXISTS ai_evaluations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  log_id UUID NOT NULL REFERENCES ai_conversation_logs(id) ON DELETE CASCADE,
  accuracy_score INT CHECK (accuracy_score >= 1 AND accuracy_score <= 5),
  tone_score INT CHECK (tone_score >= 1 AND tone_score <= 5),
  hallucination_flag BOOLEAN DEFAULT false,
  judge_reasoning TEXT,
  evaluated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  log_id UUID NOT NULL REFERENCES ai_conversation_logs(id) ON DELETE CASCADE,
  human_edited BOOLEAN DEFAULT false,
  similarity_score FLOAT CHECK (similarity_score >= 0.0 AND similarity_score <= 1.0),
  final_message_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE ai_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can access ai_evaluations for their workspaces" ON ai_evaluations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = ai_evaluations.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can access ai_feedback for their workspaces" ON ai_feedback
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = ai_feedback.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );
-- Task 4: Analytics Dashboard RPG (date_trunc grouping)

CREATE OR REPLACE FUNCTION get_ai_analytics(p_workspace_id UUID)
RETURNS TABLE (
  day DATE,
  total_conversations INT,
  avg_confidence FLOAT,
  avg_accuracy FLOAT,
  avg_tone FLOAT,
  hallucination_rate FLOAT,
  human_edit_rate FLOAT
) AS $$
BEGIN
  RETURN QUERY
  WITH daily_logs AS (
    SELECT 
      DATE_TRUNC('day', created_at)::DATE AS log_day,
      COUNT(id) AS total_logs,
      AVG(confidence_score) AS avg_conf
    FROM ai_conversation_logs
    WHERE workspace_id = p_workspace_id AND created_at >= NOW() - INTERVAL '30 days'
    GROUP BY 1
  ),
  daily_evals AS (
    SELECT 
      DATE_TRUNC('day', evaluated_at)::DATE AS eval_day,
      AVG(accuracy_score) AS avg_acc,
      AVG(tone_score) AS avg_tone,
      (SUM(CASE WHEN hallucination_flag THEN 1 ELSE 0 END)::FLOAT / COUNT(id)) AS hall_rate
    FROM ai_evaluations
    WHERE workspace_id = p_workspace_id AND evaluated_at >= NOW() - INTERVAL '30 days'
    GROUP BY 1
  ),
  daily_feedback AS (
    SELECT 
      DATE_TRUNC('day', created_at)::DATE AS fb_day,
      (SUM(CASE WHEN human_edited THEN 1 ELSE 0 END)::FLOAT / COUNT(id)) AS edit_rate
    FROM ai_feedback
    WHERE workspace_id = p_workspace_id AND created_at >= NOW() - INTERVAL '30 days'
    GROUP BY 1
  )
  SELECT 
    l.log_day,
    l.total_logs::INT,
    l.avg_conf::FLOAT,
    COALESCE(e.avg_acc, 0)::FLOAT,
    COALESCE(e.avg_tone, 0)::FLOAT,
    COALESCE(e.hall_rate, 0)::FLOAT,
    COALESCE(f.edit_rate, 0)::FLOAT
  FROM daily_logs l
  LEFT JOIN daily_evals e ON l.log_day = e.eval_day
  LEFT JOIN daily_feedback f ON l.log_day = f.fb_day
  ORDER BY l.log_day ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
