-- sprint10_schema.sql

CREATE TABLE automation_flows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('comment', 'dm', 'mention')),
  flow_json JSONB NOT NULL DEFAULT '{"nodes": [], "edges": []}',
  is_active BOOLEAN DEFAULT false,
  execution_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE automation_flows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view automation flows"
ON automation_flows FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_members.workspace_id = automation_flows.workspace_id 
    AND workspace_members.user_id = auth.uid()
  )
);

CREATE TABLE migration_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  source_system TEXT NOT NULL CHECK (source_system IN ('sprout', 'hootsuite', 'buffer')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  total_records INT DEFAULT 0,
  processed_records INT DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE migration_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view migration status"
ON migration_status FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_members.workspace_id = migration_status.workspace_id 
    AND workspace_members.user_id = auth.uid()
  )
);
