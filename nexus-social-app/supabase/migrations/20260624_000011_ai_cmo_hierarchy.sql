-- Sprint 12 Task 1: AI CMO productization hierarchy
-- Tenant → Workspace → Brand → Campaign (ai_cmo_campaigns)
-- Backfills existing workspaces with a default tenant (no data loss)

-- 1. Tenants
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  plan_type TEXT NOT NULL DEFAULT 'professional'
    CHECK (plan_type IN ('free', 'professional', 'agency', 'enterprise')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- 2. Workspaces → tenant
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- 3. Brands (agency client entities within a workspace)
CREATE TABLE IF NOT EXISTS brands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  brand_voice_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  logo_url TEXT,
  primary_color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, slug)
);

ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

-- 4. AI CMO campaigns (no legacy campaigns table in Feature 003)
CREATE TABLE IF NOT EXISTS ai_cmo_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'planning', 'active', 'paused', 'completed', 'archived')),
  objective JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ai_cmo_campaigns ENABLE ROW LEVEL SECURITY;

-- 5. Backfill: one default tenant per workspace missing tenant_id
INSERT INTO tenants (name, slug, plan_type)
SELECT
  w.name || ' Organization',
  w.slug || '-org',
  'professional'
FROM workspaces w
WHERE w.tenant_id IS NULL
ON CONFLICT (slug) DO NOTHING;

UPDATE workspaces w
SET tenant_id = t.id
FROM tenants t
WHERE w.tenant_id IS NULL
  AND t.slug = w.slug || '-org';

-- Fallback slug if collision
UPDATE workspaces w
SET tenant_id = (
  SELECT t.id FROM tenants t
  WHERE t.slug = 'workspace-' || w.id::text
  LIMIT 1
)
WHERE w.tenant_id IS NULL;

INSERT INTO tenants (name, slug, plan_type)
SELECT
  w.name || ' Organization',
  'workspace-' || w.id::text,
  'professional'
FROM workspaces w
WHERE w.tenant_id IS NULL
ON CONFLICT (slug) DO NOTHING;

UPDATE workspaces w
SET tenant_id = t.id
FROM tenants t
WHERE w.tenant_id IS NULL
  AND t.slug = 'workspace-' || w.id::text;

CREATE INDEX IF NOT EXISTS idx_workspaces_tenant_id ON workspaces(tenant_id);
CREATE INDEX IF NOT EXISTS idx_brands_workspace_id ON brands(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ai_cmo_campaigns_workspace_id ON ai_cmo_campaigns(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ai_cmo_campaigns_brand_id ON ai_cmo_campaigns(brand_id);

-- 6. RLS: tenants visible to members of any child workspace
DO $$ BEGIN
  CREATE POLICY "tenant_select_via_workspace" ON tenants
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM workspaces w
        JOIN workspace_members wm ON wm.workspace_id = w.id
        WHERE w.tenant_id = tenants.id
          AND wm.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "brands_workspace_member_all" ON brands
    FOR ALL USING (public.is_workspace_member(auth.uid(), workspace_id))
    WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "ai_cmo_campaigns_workspace_member_all" ON ai_cmo_campaigns
    FOR ALL USING (public.is_workspace_member(auth.uid(), workspace_id))
    WITH CHECK (
      public.is_workspace_member(auth.uid(), workspace_id)
      AND (
        brand_id IS NULL
        OR EXISTS (
          SELECT 1 FROM brands b
          WHERE b.id = ai_cmo_campaigns.brand_id
            AND b.workspace_id = ai_cmo_campaigns.workspace_id
        )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

NOTIFY pgrst, 'reload schema';
