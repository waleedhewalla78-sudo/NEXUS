import { describe, expect, it } from 'vitest';
import {
  agencySchema,
  brandSchema,
  tenantSchema,
  MIGRATION_000014_AGENCY_HIERARCHY_SQL,
} from '@/lib/db/schemas/agency-hierarchy';

describe('agency hierarchy schema', () => {
  it('requires explicit tenant_id on agencies', () => {
    const agency = agencySchema.parse({
      id: '550e8400-e29b-41d4-a716-446655440001',
      tenant_id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Acme Agency',
      slug: 'acme-agency',
    });

    expect(agency.tenant_id).toBe('550e8400-e29b-41d4-a716-446655440000');
  });

  it('links brands to agencies via agency_id', () => {
    const brand = brandSchema.parse({
      id: '550e8400-e29b-41d4-a716-446655440002',
      workspace_id: '550e8400-e29b-41d4-a716-446655440003',
      agency_id: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Client Brand',
      slug: 'client-brand',
    });

    expect(brand.agency_id).toBe('550e8400-e29b-41d4-a716-446655440001');
  });

  it('includes data_region on tenant with us default', () => {
    const tenant = tenantSchema.parse({
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Tenant',
      slug: 'tenant',
    });

    expect(tenant.data_region).toBe('us');
  });

  it('migration SQL references agencies and brands.agency_id', () => {
    expect(MIGRATION_000014_AGENCY_HIERARCHY_SQL).toContain('CREATE TABLE IF NOT EXISTS agencies');
    expect(MIGRATION_000014_AGENCY_HIERARCHY_SQL).toContain('agency_id UUID REFERENCES agencies');
    expect(MIGRATION_000014_AGENCY_HIERARCHY_SQL).toContain('data_region');
  });
});
