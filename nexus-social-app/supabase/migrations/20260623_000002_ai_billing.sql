-- AI agent configs, automations, credit ledger
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

CREATE TABLE IF NOT EXISTS automation_flows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('comment', 'dm', 'mention')),
  flow_json JSONB NOT NULL DEFAULT '{"nodes": [], "edges": []}',
  activepieces_flow_id TEXT,
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

CREATE OR REPLACE FUNCTION public.increment_execution_count(flow_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE automation_flows
  SET execution_count = execution_count + 1,
      updated_at = NOW()
  WHERE id = flow_id;
END;
$$;

-- Supporting tables referenced by the app
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
