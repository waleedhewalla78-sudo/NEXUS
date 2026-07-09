-- Feature 006 Sprint 1 — Conversation qualification tables (Concierge / Shadow Mode)
-- Idempotent. Additive only. Does not touch agency 000014.

CREATE TABLE IF NOT EXISTS conversation_qualifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  conversation_id TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'whatsapp'
    CHECK (channel IN ('whatsapp', 'chatwoot', 'web', 'other')),
  locale TEXT NOT NULL DEFAULT 'ar-EG',
  mode TEXT NOT NULL DEFAULT 'shadow'
    CHECK (mode IN ('shadow', 'ai_active', 'off')),
  status TEXT NOT NULL DEFAULT 'drafting'
    CHECK (status IN ('drafting', 'pending_human', 'qualified', 'escalated', 'discarded')),
  inbound_text TEXT NOT NULL DEFAULT '',
  draft_reply TEXT,
  slots JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence NUMERIC(4,3) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  lead_score_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_conversation_qualifications_ws_convo
  ON conversation_qualifications (workspace_id, conversation_id);

CREATE INDEX IF NOT EXISTS idx_conversation_qualifications_workspace_status
  ON conversation_qualifications (workspace_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS lead_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  qualification_id UUID REFERENCES conversation_qualifications(id) ON DELETE SET NULL,
  score INT NOT NULL CHECK (score >= 0 AND score <= 100),
  band TEXT NOT NULL DEFAULT 'cold'
    CHECK (band IN ('cold', 'warm', 'hot', 'qualified')),
  reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_scores_workspace_created
  ON lead_scores (workspace_id, created_at DESC);

DO $$ BEGIN
  ALTER TABLE conversation_qualifications
    ADD CONSTRAINT conversation_qualifications_lead_score_id_fkey
    FOREIGN KEY (lead_score_id) REFERENCES lead_scores(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS conversation_escalations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  qualification_id UUID NOT NULL REFERENCES conversation_qualifications(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  sentiment TEXT CHECK (sentiment IS NULL OR sentiment IN ('negative', 'neutral', 'positive', 'hostile')),
  context_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  chatwoot_assignment_id TEXT,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'accepted', 'resolved', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversation_escalations_workspace_status
  ON conversation_escalations (workspace_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS qualified_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  qualification_id UUID REFERENCES conversation_qualifications(id) ON DELETE SET NULL,
  lead_score_id UUID REFERENCES lead_scores(id) ON DELETE SET NULL,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  company TEXT,
  slots JSONB NOT NULL DEFAULT '{}'::jsonb,
  account_domain TEXT,
  crm_mirror_id UUID,
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'synced', 'booked', 'lost')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qualified_leads_workspace_created
  ON qualified_leads (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_qualified_leads_account_domain
  ON qualified_leads (workspace_id, account_domain);

CREATE TABLE IF NOT EXISTS workspace_conversation_settings (
  workspace_id UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  mode TEXT NOT NULL DEFAULT 'shadow'
    CHECK (mode IN ('shadow', 'ai_active', 'off')),
  locale_default TEXT NOT NULL DEFAULT 'ar-EG',
  compliance_profile TEXT NOT NULL DEFAULT 'mena_conversational_v1',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE conversation_qualifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE qualified_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_conversation_settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY workspace_isolation_conversation_qualifications ON conversation_qualifications FOR ALL
    USING (workspace_id IN (SELECT wm.workspace_id FROM workspace_members wm WHERE wm.user_id = auth.uid()))
    WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM workspace_members wm WHERE wm.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY workspace_isolation_lead_scores ON lead_scores FOR ALL
    USING (workspace_id IN (SELECT wm.workspace_id FROM workspace_members wm WHERE wm.user_id = auth.uid()))
    WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM workspace_members wm WHERE wm.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY workspace_isolation_conversation_escalations ON conversation_escalations FOR ALL
    USING (workspace_id IN (SELECT wm.workspace_id FROM workspace_members wm WHERE wm.user_id = auth.uid()))
    WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM workspace_members wm WHERE wm.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY workspace_isolation_qualified_leads ON qualified_leads FOR ALL
    USING (workspace_id IN (SELECT wm.workspace_id FROM workspace_members wm WHERE wm.user_id = auth.uid()))
    WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM workspace_members wm WHERE wm.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY workspace_isolation_workspace_conversation_settings ON workspace_conversation_settings FOR ALL
    USING (workspace_id IN (SELECT wm.workspace_id FROM workspace_members wm WHERE wm.user_id = auth.uid()))
    WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM workspace_members wm WHERE wm.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY service_role_conversation_qualifications ON conversation_qualifications FOR ALL
    USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY service_role_lead_scores ON lead_scores FOR ALL
    USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY service_role_conversation_escalations ON conversation_escalations FOR ALL
    USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY service_role_qualified_leads ON qualified_leads FOR ALL
    USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY service_role_workspace_conversation_settings ON workspace_conversation_settings FOR ALL
    USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

NOTIFY pgrst, 'reload schema';
