-- ai_schema.sql

CREATE TABLE workspace_ai_settings (
  workspace_id UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  fine_tuned_model_id TEXT,
  training_status TEXT CHECK (training_status IN ('idle', 'training', 'active', 'failed')) DEFAULT 'idle',
  last_trained_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE workspace_ai_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace_ai_settings" 
ON workspace_ai_settings FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_members.workspace_id = workspace_ai_settings.workspace_id 
    AND workspace_members.user_id = auth.uid()
  )
);

CREATE POLICY "Members can update workspace_ai_settings" 
ON workspace_ai_settings FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_members.workspace_id = workspace_ai_settings.workspace_id 
    AND workspace_members.user_id = auth.uid()
  )
);

CREATE TABLE predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  optimal_times JSONB,
  churn_score NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view predictions" 
ON predictions FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_members.workspace_id = predictions.workspace_id 
    AND workspace_members.user_id = auth.uid()
  )
);

CREATE POLICY "Members can insert predictions" 
ON predictions FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_members.workspace_id = predictions.workspace_id 
    AND workspace_members.user_id = auth.uid()
  )
);
