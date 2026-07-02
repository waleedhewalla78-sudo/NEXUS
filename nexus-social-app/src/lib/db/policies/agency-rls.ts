/**
 * Feature 004 Phase 5 — Agency hierarchy RLS policy generators.
 *
 * [SPEC]
 * - tenant_admin: all agencies/brands under tenant
 * - agency_admin: brands + campaigns where brand.agency_id = assigned agency ONLY
 * - workspace_operator: existing workspace_members scope (unchanged)
 * - Agency A admin MUST NOT read Agency B data within same tenant
 */

import { AGENCY_HIERARCHY_POLICY_NAMES } from '@/lib/db/schemas/agency-hierarchy';
import type { AgencyRole } from '@/lib/db/schemas/agency-hierarchy';

export { AGENCY_HIERARCHY_POLICY_NAMES };

/** Returns true when user holds tenant_admin on any agency under the tenant. */
export const SQL_IS_TENANT_ADMIN = `
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
`;

/** Returns true when user is agency_admin for the given agency. */
export const SQL_IS_AGENCY_ADMIN = `
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
`;

/** User can access brand if workspace member OR agency admin for brand.agency_id OR tenant admin. */
export const SQL_CAN_ACCESS_BRAND = `
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
`;

export const SQL_AGENCIES_TENANT_ISOLATION = `
DO $$ BEGIN
  CREATE POLICY "${AGENCY_HIERARCHY_POLICY_NAMES.AGENCIES_TENANT_ISOLATION}" ON agencies
    FOR SELECT USING (
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
`;

export const SQL_BRANDS_AGENCY_ISOLATION = `
DO $$ BEGIN
  CREATE POLICY "${AGENCY_HIERARCHY_POLICY_NAMES.BRANDS_AGENCY_ISOLATION}" ON brands
    FOR SELECT USING (
      public.is_workspace_member(auth.uid(), workspace_id)
      OR (agency_id IS NOT NULL AND public.is_agency_admin(auth.uid(), agency_id))
      OR EXISTS (
        SELECT 1 FROM workspaces w
        WHERE w.id = brands.workspace_id
          AND public.is_tenant_admin(auth.uid(), w.tenant_id)
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
`;

export const SQL_BRANDS_AGENCY_ADMIN_ALL = `
DO $$ BEGIN
  CREATE POLICY "${AGENCY_HIERARCHY_POLICY_NAMES.BRANDS_AGENCY_ADMIN_ALL}" ON brands
    FOR ALL USING (
      public.is_workspace_member(auth.uid(), workspace_id)
      OR (agency_id IS NOT NULL AND public.is_agency_admin(auth.uid(), agency_id))
    )
    WITH CHECK (
      public.is_workspace_member(auth.uid(), workspace_id)
      OR (
        agency_id IS NOT NULL
        AND public.is_agency_admin(auth.uid(), agency_id)
        AND NOT EXISTS (
          SELECT 1 FROM brands other
          WHERE other.id = brands.id
            AND other.agency_id IS DISTINCT FROM brands.agency_id
            AND other.agency_id IS NOT NULL
            AND NOT public.is_agency_admin(auth.uid(), other.agency_id)
        )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
`;

export const SQL_CAMPAIGNS_AGENCY_ISOLATION = `
DO $$ BEGIN
  CREATE POLICY "${AGENCY_HIERARCHY_POLICY_NAMES.CAMPAIGNS_AGENCY_ISOLATION}" ON ai_cmo_campaigns
    FOR SELECT USING (
      public.is_workspace_member(auth.uid(), workspace_id)
      OR (
        brand_id IS NOT NULL
        AND public.can_access_brand(auth.uid(), brand_id)
        AND (
          SELECT b.agency_id FROM brands b WHERE b.id = ai_cmo_campaigns.brand_id
        ) IS NOT NULL
      )
      OR EXISTS (
        SELECT 1 FROM workspaces w
        WHERE w.id = ai_cmo_campaigns.workspace_id
          AND public.is_tenant_admin(auth.uid(), w.tenant_id)
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
`;

export const SQL_AGENCY_MEMBERS_SELF = `
DO $$ BEGIN
  CREATE POLICY "${AGENCY_HIERARCHY_POLICY_NAMES.AGENCY_MEMBERS_SELF}" ON agency_members
    FOR SELECT USING (
      user_id = auth.uid()
      OR public.is_agency_admin(auth.uid(), agency_id)
      OR EXISTS (
        SELECT 1 FROM agencies a
        WHERE a.id = agency_members.agency_id
          AND public.is_tenant_admin(auth.uid(), a.tenant_id)
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
`;

/** Full RLS bootstrap for Migration 000014 apply scripts. */
export function buildAgencyHierarchyRlsSql(): string {
  return [
    SQL_IS_TENANT_ADMIN,
    SQL_IS_AGENCY_ADMIN,
    SQL_CAN_ACCESS_BRAND,
    SQL_AGENCIES_TENANT_ISOLATION,
    SQL_BRANDS_AGENCY_ISOLATION,
    SQL_BRANDS_AGENCY_ADMIN_ALL,
    SQL_CAMPAIGNS_AGENCY_ISOLATION,
    SQL_AGENCY_MEMBERS_SELF,
  ].join('\n\n');
}

/** Application-side guard: agency A cannot access agency B resources. */
export function assertAgencyScope(input: {
  userAgencyIds: string[];
  resourceAgencyId: string | null | undefined;
  userRoles: AgencyRole[];
}): boolean {
  if (!input.resourceAgencyId) {
    return input.userRoles.includes('tenant_admin');
  }

  if (input.userRoles.includes('tenant_admin')) {
    return true;
  }

  return input.userAgencyIds.includes(input.resourceAgencyId);
}

/** Verify cross-agency isolation — returns false if user in agency A tries to read agency B. */
export function isCrossAgencyLeak(input: {
  actorAgencyId: string;
  resourceAgencyId: string;
  actorIsTenantAdmin: boolean;
}): boolean {
  if (input.actorIsTenantAdmin) return false;
  return input.actorAgencyId !== input.resourceAgencyId;
}

export const agencyRlsUtils = {
  buildAgencyHierarchyRlsSql,
  assertAgencyScope,
  isCrossAgencyLeak,
};
