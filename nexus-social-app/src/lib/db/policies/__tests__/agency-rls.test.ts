import { describe, expect, it } from 'vitest';
import {
  assertAgencyScope,
  buildAgencyHierarchyRlsSql,
  isCrossAgencyLeak,
} from '@/lib/db/policies/agency-rls';
import { AGENCY_HIERARCHY_POLICY_NAMES } from '@/lib/db/schemas/agency-hierarchy';

describe('agency RLS policies', () => {
  it('includes tenant_id linkage in agencies DDL', () => {
    const sql = buildAgencyHierarchyRlsSql();
    expect(sql).toContain('is_tenant_admin');
    expect(sql).toContain('is_agency_admin');
    expect(sql).toContain(AGENCY_HIERARCHY_POLICY_NAMES.BRANDS_AGENCY_ISOLATION);
    expect(sql).toContain(AGENCY_HIERARCHY_POLICY_NAMES.CAMPAIGNS_AGENCY_ISOLATION);
  });

  it('blocks agency A admin from agency B resources', () => {
    expect(
      isCrossAgencyLeak({
        actorAgencyId: 'agency-a',
        resourceAgencyId: 'agency-b',
        actorIsTenantAdmin: false,
      }),
    ).toBe(true);
  });

  it('allows tenant admin cross-agency visibility', () => {
    expect(
      isCrossAgencyLeak({
        actorAgencyId: 'agency-a',
        resourceAgencyId: 'agency-b',
        actorIsTenantAdmin: true,
      }),
    ).toBe(false);
  });

  it('permits agency admin access only to assigned agency brands', () => {
    expect(
      assertAgencyScope({
        userAgencyIds: ['agency-a'],
        resourceAgencyId: 'agency-a',
        userRoles: ['agency_admin'],
      }),
    ).toBe(true);

    expect(
      assertAgencyScope({
        userAgencyIds: ['agency-a'],
        resourceAgencyId: 'agency-b',
        userRoles: ['agency_admin'],
      }),
    ).toBe(false);
  });
});
