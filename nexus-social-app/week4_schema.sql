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
