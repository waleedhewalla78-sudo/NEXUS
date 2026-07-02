-- Feature 004 Phase 5 — Agency hierarchy + data residency + campaign OCC (Migration 000014)
-- ADDITIVE ONLY — does not drop or alter 003 columns destructively.
-- See src/lib/db/schemas/agency-hierarchy.ts and src/lib/db/policies/agency-rls.ts

-- =============================================================================
-- TASK 1: Agency hierarchy
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

-- Backfill: one default agency per tenant that has brands (non-destructive)
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

-- =============================================================================
-- TASK 3: Data residency on tenants (default 'us' for existing rows)
-- =============================================================================

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS data_region TEXT NOT NULL DEFAULT 'us'
  CHECK (data_region IN ('eu', 'mena', 'us'));

-- =============================================================================
-- TASK 4: Optimistic concurrency on ai_cmo_campaigns
-- =============================================================================

ALTER TABLE ai_cmo_campaigns ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

-- =============================================================================
-- TASK 2: RLS helper functions + policies
-- =============================================================================

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
