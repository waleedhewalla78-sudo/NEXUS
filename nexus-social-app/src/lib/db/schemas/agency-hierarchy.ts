/**
 * Feature 004 Phase 5 — Agency hierarchy schema (Migration 000014).
 *
 * [SPEC] Enterprise B2B hierarchy:
 *   Tenant → Agency → Client Brand (brands.agency_id)
 *
 * Additive only — does not alter or drop 003 `tenants` / `workspaces` columns.
 * RLS policy names are stable identifiers for migration + audit.
 */

import { z } from 'zod';

export const AGENCY_HIERARCHY_POLICY_NAMES = {
  AGENCIES_TENANT_ISOLATION: 'agencies_tenant_isolation',
  AGENCIES_AGENCY_ADMIN_SELECT: 'agencies_agency_admin_select',
  BRANDS_AGENCY_ISOLATION: 'brands_agency_isolation',
  BRANDS_AGENCY_ADMIN_ALL: 'brands_agency_admin_all',
  CAMPAIGNS_AGENCY_ISOLATION: 'ai_cmo_campaigns_agency_isolation',
  AGENCY_MEMBERS_SELF: 'agency_members_self',
} as const;

export type AgencyHierarchyPolicyName =
  (typeof AGENCY_HIERARCHY_POLICY_NAMES)[keyof typeof AGENCY_HIERARCHY_POLICY_NAMES];

export const dataRegionSchema = z.enum(['eu', 'mena', 'us']);
export type DataRegion = z.infer<typeof dataRegionSchema>;

export const agencyRoleSchema = z.enum(['tenant_admin', 'agency_admin', 'workspace_operator']);
export type AgencyRole = z.infer<typeof agencyRoleSchema>;

export const agencySettingsSchema = z
  .object({
    whiteLabel: z
      .object({
        logoUrl: z.string().optional(),
        primaryColor: z.string().optional(),
        customDomain: z.string().optional(),
      })
      .optional(),
    billing: z
      .object({
        stripeCustomerId: z.string().optional(),
      })
      .optional(),
    features: z.record(z.string(), z.boolean()).optional(),
  })
  .passthrough();

export type AgencySettings = z.infer<typeof agencySettingsSchema>;

export const agencySchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  name: z.string().min(1),
  slug: z.string().min(1),
  settings: agencySettingsSchema.default({}),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export type Agency = z.infer<typeof agencySchema>;

export const brandSchema = z.object({
  id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  agency_id: z.string().uuid().nullable().optional(),
  name: z.string().min(1),
  slug: z.string().min(1),
  brand_voice_config: z.record(z.string(), z.unknown()).default({}),
  logo_url: z.string().nullable().optional(),
  primary_color: z.string().nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export type Brand = z.infer<typeof brandSchema>;

export const tenantSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  slug: z.string().min(1),
  plan_type: z.enum(['free', 'professional', 'agency', 'enterprise']).default('professional'),
  data_region: dataRegionSchema.default('us'),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export type Tenant = z.infer<typeof tenantSchema>;

export const agencyMemberSchema = z.object({
  id: z.string().uuid(),
  agency_id: z.string().uuid(),
  user_id: z.string().uuid(),
  role: agencyRoleSchema,
  created_at: z.string().optional(),
});

export type AgencyMember = z.infer<typeof agencyMemberSchema>;

/** DDL for Migration 000014 — apply via supabase/migrations/20260624_000014_agencies_hierarchy.sql */
export const MIGRATION_000014_AGENCY_HIERARCHY_SQL = `
-- Feature 004 Phase 5 — Agency hierarchy (additive, non-destructive)

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

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS data_region TEXT NOT NULL DEFAULT 'us'
  CHECK (data_region IN ('eu', 'mena', 'us'));

ALTER TABLE ai_cmo_campaigns ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

-- Backfill default agency per tenant with brands (non-destructive)
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
WHERE b.workspace_id = w.id AND b.agency_id IS NULL;
`;

export const AGENCY_HIERARCHY_TABLES = {
  AGENCIES: 'agencies',
  AGENCY_MEMBERS: 'agency_members',
  BRANDS: 'brands',
  TENANTS: 'tenants',
} as const;
