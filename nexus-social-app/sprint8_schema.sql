-- sprint8_schema.sql

-- =========================================================================
-- 1. SUBSCRIPTIONS & MONETIZATION
-- =========================================================================

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status TEXT, -- 'active', 'past_due', 'canceled', etc.
  plan_id TEXT,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view their subscription"
ON subscriptions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_members.workspace_id = subscriptions.workspace_id 
    AND workspace_members.user_id = auth.uid()
  )
);

CREATE TABLE ai_credit_ledger (
  workspace_id UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  total_credits INT DEFAULT 1000,
  used_credits INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE ai_credit_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view their credits"
ON ai_credit_ledger FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_members.workspace_id = ai_credit_ledger.workspace_id 
    AND workspace_members.user_id = auth.uid()
  )
);


-- =========================================================================
-- 2. CLIENT PORTAL (STRICT ISOLATION)
-- =========================================================================

-- In a real app we might reference a 'clients' table, but here we keep it simple:
-- parent_client_id is an identifier (e.g., a specific brand's UUID).
CREATE TABLE client_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  parent_client_id UUID NOT NULL, -- The specific isolated brand
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE client_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view client users"
ON client_users FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_members.workspace_id = client_users.workspace_id 
    AND workspace_members.user_id = auth.uid()
    AND workspace_members.role = 'admin'
  )
);
CREATE POLICY "Client users can view their own mapping"
ON client_users FOR SELECT
USING (user_id = auth.uid());

-- NOTE: To enforce strict isolation on the `posts` table for clients,
-- you would alter the RLS on `posts` to check if the user is a client, 
-- and if so, only allow them if `posts.client_id = client_users.parent_client_id`.
-- Assuming `posts` has a `client_id` column. If not, we'd add it:
ALTER TABLE posts ADD COLUMN IF NOT EXISTS client_id UUID;
