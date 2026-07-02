-- omnichannel_schema.sql

-- Enable pgcrypto for uuid generation if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table for mapping Chatwoot inboxes to Workspaces
CREATE TABLE channel_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  channel_type TEXT NOT NULL CHECK (channel_type IN ('whatsapp', 'sms')),
  provider TEXT NOT NULL CHECK (provider IN ('meta', 'twilio')),
  chatwoot_inbox_id INTEGER NOT NULL UNIQUE, -- Maps to Chatwoot's internal ID
  phone_number TEXT NOT NULL,
  encrypted_credentials JSONB NOT NULL, 
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE channel_credentials ENABLE ROW LEVEL SECURITY;

-- Policy: Workspace members can view channel credentials for their workspace
CREATE POLICY "Members can view channel_credentials" 
ON channel_credentials FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_members.workspace_id = channel_credentials.workspace_id 
    AND workspace_members.user_id = auth.uid()
  )
);

-- Policy: Workspace members with specific roles (or all members depending on requirements) can insert
CREATE POLICY "Members can insert channel_credentials" 
ON channel_credentials FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_members.workspace_id = channel_credentials.workspace_id 
    AND workspace_members.user_id = auth.uid()
  )
);

-- Policy: Workspace members can update their own channel credentials
CREATE POLICY "Members can update channel_credentials" 
ON channel_credentials FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_members.workspace_id = channel_credentials.workspace_id 
    AND workspace_members.user_id = auth.uid()
  )
);

-- Policy: Workspace members can delete
CREATE POLICY "Members can delete channel_credentials" 
ON channel_credentials FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_members.workspace_id = channel_credentials.workspace_id 
    AND workspace_members.user_id = auth.uid()
  )
);
