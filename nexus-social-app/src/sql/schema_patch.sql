-- Patch missing columns/tables after essential_bootstrap.sql
-- Run in Supabase SQL Editor if you see error code 42703 (undefined column)

ALTER TABLE users ADD COLUMN IF NOT EXISTS has_completed_onboarding BOOLEAN DEFAULT FALSE;

ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS branding JSONB DEFAULT '{}'::jsonb;

-- AI agent settings (Settings > AI Agent page)
CREATE TABLE IF NOT EXISTS ai_agent_configs (
  workspace_id UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  dify_app_id TEXT NOT NULL DEFAULT 'local-dev-app',
  dify_dataset_id TEXT NOT NULL DEFAULT 'local-dev-dataset',
  persona_name TEXT DEFAULT 'Support Agent',
  system_prompt_override TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  is_globally_disabled BOOLEAN DEFAULT FALSE,
  traffic_allocation_percentage INT DEFAULT 100 CHECK (traffic_allocation_percentage >= 0 AND traffic_allocation_percentage <= 100),
  daily_token_limit INT DEFAULT 100000,
  dify_app_api_key TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE ai_agent_configs ADD COLUMN IF NOT EXISTS is_globally_disabled BOOLEAN DEFAULT FALSE;
ALTER TABLE ai_agent_configs ADD COLUMN IF NOT EXISTS traffic_allocation_percentage INT DEFAULT 100;
ALTER TABLE ai_agent_configs ADD COLUMN IF NOT EXISTS daily_token_limit INT DEFAULT 100000;
ALTER TABLE ai_agent_configs ADD COLUMN IF NOT EXISTS dify_app_api_key TEXT;

ALTER TABLE ai_agent_configs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users manage ai_agent_configs for their workspaces" ON ai_agent_configs
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM workspace_members wm
        WHERE wm.workspace_id = ai_agent_configs.workspace_id
          AND wm.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Omnichannel / settings integrations
CREATE TABLE IF NOT EXISTS channel_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  channel_type TEXT NOT NULL CHECK (channel_type IN ('whatsapp', 'sms')),
  provider TEXT NOT NULL CHECK (provider IN ('meta', 'twilio')),
  chatwoot_inbox_id INTEGER NOT NULL UNIQUE,
  phone_number TEXT NOT NULL,
  encrypted_credentials JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE channel_credentials ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Members can view channel_credentials" ON channel_credentials
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM workspace_members wm
        WHERE wm.workspace_id = channel_credentials.workspace_id
          AND wm.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Automations builder (Use Template)
CREATE TABLE IF NOT EXISTS automation_flows (
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

DO $$ BEGIN
  CREATE POLICY "Members can view automation flows" ON automation_flows
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM workspace_members wm
        WHERE wm.workspace_id = automation_flows.workspace_id
          AND wm.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Reputation monitoring
CREATE TABLE IF NOT EXISTS listening_queries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  query_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mentions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  query_id UUID REFERENCES listening_queries(id) ON DELETE CASCADE,
  source_platform TEXT NOT NULL,
  content TEXT NOT NULL,
  author_name TEXT,
  author_url TEXT,
  sentiment TEXT CHECK (sentiment IN ('Positive', 'Neutral', 'Negative')),
  published_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS external_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  author_name TEXT,
  review_text TEXT,
  reply_text TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'responded')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE listening_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_reviews ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view queries for their workspaces" ON listening_queries
    FOR SELECT USING (
      workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can view external reviews for their workspaces" ON external_reviews
    FOR SELECT USING (
      workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Chatwoot inbox ↔ workspace mapping (live inbox + webhooks)
CREATE TABLE IF NOT EXISTS chatwoot_inbox_workspace_map (
  chatwoot_inbox_id INTEGER PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  ai_bot_user_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE chatwoot_inbox_workspace_map ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can access mapping for their workspaces" ON chatwoot_inbox_workspace_map
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM workspace_members wm
        WHERE wm.workspace_id = chatwoot_inbox_workspace_map.workspace_id
          AND wm.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Persistent user notifications
CREATE TABLE IF NOT EXISTS user_notifications (
  id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  href TEXT NOT NULL DEFAULT '/',
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, workspace_id, id)
);

ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users read own notifications" ON user_notifications
    FOR ALL USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Pending team email invites
CREATE TABLE IF NOT EXISTS workspace_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  invited_by UUID REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (workspace_id, email)
);

ALTER TABLE workspace_invites ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Admins manage workspace invites" ON workspace_invites
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM workspace_members wm
        WHERE wm.workspace_id = workspace_invites.workspace_id
          AND wm.user_id = auth.uid()
          AND wm.role IN ('owner', 'admin')
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Custom PDF report layouts
CREATE TABLE IF NOT EXISTS custom_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Default Report',
  layout JSONB NOT NULL DEFAULT '[]'::jsonb,
  schedule TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE custom_reports ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Members manage custom reports" ON custom_reports
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM workspace_members wm
        WHERE wm.workspace_id = custom_reports.workspace_id
          AND wm.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Per-workspace SSO / OAuth configuration
CREATE TABLE IF NOT EXISTS workspace_sso_configs (
  workspace_id UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'saml' CHECK (provider IN ('saml', 'oauth')),
  oauth_client_id TEXT,
  oauth_client_secret TEXT,
  metadata_url TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE workspace_sso_configs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Admins manage workspace SSO config" ON workspace_sso_configs
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM workspace_members wm
        WHERE wm.workspace_id = workspace_sso_configs.workspace_id
          AND wm.user_id = auth.uid()
          AND wm.role IN ('owner', 'admin')
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AI credit ledger + atomic deduction RPC (Generate with AI, inbox aiReply)
CREATE TABLE IF NOT EXISTS ai_credit_ledger (
  workspace_id UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  total_credits INTEGER NOT NULL DEFAULT 1000,
  used_credits INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ai_credit_ledger ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Members can view their credits" ON ai_credit_ledger
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM workspace_members wm
        WHERE wm.workspace_id = ai_credit_ledger.workspace_id
          AND wm.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE ai_credit_ledger DROP CONSTRAINT IF EXISTS check_positive_credits;
ALTER TABLE ai_credit_ledger ADD CONSTRAINT check_positive_credits CHECK (total_credits >= used_credits);

CREATE OR REPLACE FUNCTION public.deduct_ai_credits(p_workspace_id UUID, p_amount INT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE ai_credit_ledger
    SET used_credits = used_credits + p_amount,
        updated_at = NOW()
    WHERE workspace_id = p_workspace_id
      AND (total_credits - used_credits) >= p_amount;

    IF FOUND THEN
        RETURN TRUE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM ai_credit_ledger WHERE workspace_id = p_workspace_id) THEN
        INSERT INTO ai_credit_ledger (workspace_id, total_credits, used_credits)
        VALUES (p_workspace_id, 1000, p_amount);
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$;

NOTIFY pgrst, 'reload schema';
