-- =============================================================================
-- Feature 004 — PRODUCTION DEPLOY: Migrations 000013 + 000014
-- =============================================================================
-- PREREQUISITE: 20260624_000012_ai_cmo_foundation.sql MUST be applied first.
--
-- Run this entire file in Supabase SQL Editor (or via CLI in order):
--   1. Section A — 000013 (Phase 2–6 extensions)
--   2. Section B — 000014 (Agency hierarchy + data residency + OCC)
--
-- TS validation sources:
--   src/lib/db/schemas/ai-cmo-phase-2.ts
--   src/lib/db/schemas/agency-hierarchy.ts
-- =============================================================================

-- =============================================================================
-- SECTION A — Migration 000013 (ai_cmo_sprint14)
-- =============================================================================

-- Feature 004 Phase 2/3/4/6 — Sprint 14 extensions (Migration 000013)
-- Validated against src/lib/db/schemas/ai-cmo-phase-2.ts
-- ADDITIVE ONLY — requires 000012 (ai_cmo foundation) applied first.

CREATE TABLE IF NOT EXISTS ai_cmo_decision_ledger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  decision_id UUID NOT NULL,
  agent_name TEXT NOT NULL,
  decision_type TEXT,
  rationale JSONB DEFAULT '{}'::jsonb,
  expected_kpis JSONB DEFAULT '{}'::jsonb,
  actual_kpis JSONB DEFAULT '{}'::jsonb,
  variance JSONB DEFAULT '{}'::jsonb,
  human_override BOOLEAN NOT NULL DEFAULT false,
  lesson_learned TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  measured_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ai_cmo_decision_ledger_workspace ON ai_cmo_decision_ledger(workspace_id, created_at);

CREATE TABLE IF NOT EXISTS ai_cmo_agent_decisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES ai_cmo_campaigns(id) ON DELETE SET NULL,
  agent_name TEXT NOT NULL,
  input_hash TEXT NOT NULL,
  input_summary JSONB DEFAULT '{}'::jsonb,
  output JSONB NOT NULL DEFAULT '{}'::jsonb,
  model_used TEXT,
  token_count INT,
  latency_ms INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_cmo_agent_decisions_workspace ON ai_cmo_agent_decisions(workspace_id, created_at);

CREATE TABLE IF NOT EXISTS ai_cmo_experiments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES ai_cmo_campaigns(id) ON DELETE SET NULL,
  experiment_key TEXT NOT NULL,
  variant TEXT NOT NULL,
  hypothesis TEXT,
  metrics JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'running', 'concluded')),
  winner_variant TEXT,
  started_at TIMESTAMPTZ,
  concluded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_cmo_experiments_workspace ON ai_cmo_experiments(workspace_id, status);

CREATE TABLE IF NOT EXISTS ai_cmo_memory_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
  summary_period TEXT NOT NULL CHECK (summary_period IN ('weekly', 'monthly')),
  summary_text TEXT NOT NULL,
  learning_ids UUID[] NOT NULL DEFAULT '{}',
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_cmo_memory_summaries_workspace
  ON ai_cmo_memory_summaries(workspace_id, summary_period, updated_at DESC);

CREATE TABLE IF NOT EXISTS ai_cmo_budget_policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK (scope IN ('workspace', 'tenant', 'campaign')),
  scope_id UUID,
  period TEXT NOT NULL CHECK (period IN ('daily', 'monthly')),
  cap_usd DECIMAL(12, 2) NOT NULL,
  warn_thresholds FLOAT[] DEFAULT ARRAY[0.5, 0.8, 0.95],
  action_on_cap TEXT NOT NULL DEFAULT 'block'
    CHECK (action_on_cap IN ('block', 'require_approval', 'notify_only')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ai_cmo_campaigns ADD COLUMN IF NOT EXISTS calibrated_confidence FLOAT
  CHECK (calibrated_confidence IS NULL OR (calibrated_confidence >= 0 AND calibrated_confidence <= 1));

ALTER TABLE ai_cmo_evaluations ADD COLUMN IF NOT EXISTS uniqueness_score FLOAT
  CHECK (uniqueness_score IS NULL OR (uniqueness_score >= 0 AND uniqueness_score <= 1));
ALTER TABLE ai_cmo_evaluations ADD COLUMN IF NOT EXISTS eeat_score FLOAT
  CHECK (eeat_score IS NULL OR (eeat_score >= 0 AND eeat_score <= 1));
ALTER TABLE ai_cmo_evaluations ADD COLUMN IF NOT EXISTS engagement_score FLOAT
  CHECK (engagement_score IS NULL OR (engagement_score >= 0 AND engagement_score <= 1));
ALTER TABLE ai_cmo_evaluations ADD COLUMN IF NOT EXISTS platform_compliance_score FLOAT
  CHECK (platform_compliance_score IS NULL OR (platform_compliance_score >= 0 AND platform_compliance_score <= 1));
ALTER TABLE ai_cmo_evaluations ADD COLUMN IF NOT EXISTS auto_rejected BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE ai_cmo_evaluations ADD COLUMN IF NOT EXISTS rejection_reasons TEXT[] DEFAULT '{}';
ALTER TABLE ai_cmo_evaluations ADD COLUMN IF NOT EXISTS evaluator_model TEXT;
ALTER TABLE ai_cmo_evaluations ADD COLUMN IF NOT EXISTS calibrated_confidence FLOAT
  CHECK (calibrated_confidence IS NULL OR (calibrated_confidence >= 0 AND calibrated_confidence <= 1));

ALTER TABLE ai_cmo_decision_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_cmo_agent_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_cmo_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_cmo_memory_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_cmo_budget_policies ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Members manage ai_cmo_decision_ledger" ON ai_cmo_decision_ledger FOR ALL USING (
    public.is_workspace_member(auth.uid(), workspace_id)
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Members manage ai_cmo_agent_decisions" ON ai_cmo_agent_decisions FOR ALL USING (
    public.is_workspace_member(auth.uid(), workspace_id)
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Members manage ai_cmo_experiments" ON ai_cmo_experiments FOR ALL USING (
    public.is_workspace_member(auth.uid(), workspace_id)
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Members manage ai_cmo_memory_summaries" ON ai_cmo_memory_summaries FOR ALL USING (
    public.is_workspace_member(auth.uid(), workspace_id)
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Members manage ai_cmo_budget_policies" ON ai_cmo_budget_policies FOR ALL USING (
    workspace_id IS NULL OR public.is_workspace_member(auth.uid(), workspace_id)
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS ai_cmo_approval_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES ai_cmo_campaigns(id) ON DELETE CASCADE,
  content_id UUID REFERENCES ai_cmo_content_pieces(id) ON DELETE SET NULL,
  severity TEXT NOT NULL CHECK (severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  reason TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  assignee_user_id UUID,
  sla_due_at TIMESTAMPTZ,
  decided_at TIMESTAMPTZ,
  decided_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_cmo_approval_requests_workspace
  ON ai_cmo_approval_requests(workspace_id, status, created_at);

ALTER TABLE ai_cmo_approval_requests ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Members manage ai_cmo_approval_requests" ON ai_cmo_approval_requests FOR ALL USING (
    public.is_workspace_member(auth.uid(), workspace_id)
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION refresh_ai_cmo_materialized_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY ai_cmo_cost_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY ai_cmo_attribution_summary;
  EXCEPTION WHEN OTHERS THEN
    REFRESH MATERIALIZED VIEW ai_cmo_cost_summary;
    REFRESH MATERIALIZED VIEW ai_cmo_attribution_summary;
  END;
END;
$$;

-- =============================================================================
-- SECTION B — Migration 000014 (agencies_hierarchy)
-- =============================================================================

CREATE TABLE IF NOT EXISTS agencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_agencies_tenant ON agencies(tenant_id);

ALTER TABLE brands ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES agencies(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_brands_agency_id ON brands(agency_id);

CREATE TABLE IF NOT EXISTS agency_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('tenant_admin', 'agency_admin', 'workspace_operator')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (agency_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_agency_members_user ON agency_members(user_id);
CREATE INDEX IF NOT EXISTS idx_agency_members_agency ON agency_members(agency_id);

INSERT INTO agencies (tenant_id, name, slug)
SELECT DISTINCT t.id, t.name || ' Agency', t.slug || '-agency'
FROM tenants t
JOIN workspaces w ON w.tenant_id = t.id
JOIN brands b ON b.workspace_id = w.id
WHERE NOT EXISTS (
  SELECT 1 FROM agencies a WHERE a.tenant_id = t.id AND a.slug = t.slug || '-agency'
);

UPDATE brands b
SET agency_id = a.id
FROM workspaces w
JOIN tenants t ON t.id = w.tenant_id
JOIN agencies a ON a.tenant_id = t.id AND a.slug = t.slug || '-agency'
WHERE b.workspace_id = w.id
  AND b.agency_id IS NULL;

ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_members ENABLE ROW LEVEL SECURITY;

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS data_region TEXT NOT NULL DEFAULT 'us'
  CHECK (data_region IN ('eu', 'mena', 'us'));

ALTER TABLE ai_cmo_campaigns ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

CREATE OR REPLACE FUNCTION public.is_tenant_admin(user_uuid uuid, tenant_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM agency_members am
    JOIN agencies a ON a.id = am.agency_id
    WHERE am.user_id = user_uuid
      AND am.role = 'tenant_admin'
      AND a.tenant_id = tenant_uuid
  );
$$;

CREATE OR REPLACE FUNCTION public.is_agency_admin(user_uuid uuid, agency_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM agency_members am
    WHERE am.user_id = user_uuid
      AND am.agency_id = agency_uuid
      AND am.role IN ('agency_admin', 'tenant_admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_brand(user_uuid uuid, brand_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM brands b
    WHERE b.id = brand_uuid
      AND (
        public.is_workspace_member(user_uuid, b.workspace_id)
        OR (b.agency_id IS NOT NULL AND public.is_agency_admin(user_uuid, b.agency_id))
        OR EXISTS (
          SELECT 1 FROM workspaces w
          WHERE w.id = b.workspace_id
            AND public.is_tenant_admin(user_uuid, w.tenant_id)
        )
      )
  );
$$;

DO $$ BEGIN
  CREATE POLICY "agencies_tenant_isolation" ON agencies FOR SELECT USING (
    public.is_tenant_admin(auth.uid(), tenant_id)
    OR EXISTS (
      SELECT 1 FROM agency_members am
      WHERE am.agency_id = agencies.id AND am.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM workspaces w
      JOIN workspace_members wm ON wm.workspace_id = w.id
      WHERE w.tenant_id = agencies.tenant_id AND wm.user_id = auth.uid()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "brands_agency_isolation" ON brands FOR SELECT USING (
    public.is_workspace_member(auth.uid(), workspace_id)
    OR (agency_id IS NOT NULL AND public.is_agency_admin(auth.uid(), agency_id))
    OR EXISTS (
      SELECT 1 FROM workspaces w
      WHERE w.id = brands.workspace_id
        AND public.is_tenant_admin(auth.uid(), w.tenant_id)
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "ai_cmo_campaigns_agency_isolation" ON ai_cmo_campaigns FOR SELECT USING (
    public.is_workspace_member(auth.uid(), workspace_id)
    OR (
      brand_id IS NOT NULL AND public.can_access_brand(auth.uid(), brand_id)
    )
    OR EXISTS (
      SELECT 1 FROM workspaces w
      WHERE w.id = ai_cmo_campaigns.workspace_id
        AND public.is_tenant_admin(auth.uid(), w.tenant_id)
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "agency_members_self" ON agency_members FOR SELECT USING (
    user_id = auth.uid()
    OR public.is_agency_admin(auth.uid(), agency_id)
    OR EXISTS (
      SELECT 1 FROM agencies a
      WHERE a.id = agency_members.agency_id
        AND public.is_tenant_admin(auth.uid(), a.tenant_id)
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

NOTIFY pgrst, 'reload schema';
