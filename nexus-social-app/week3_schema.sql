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
