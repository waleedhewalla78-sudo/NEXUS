/**
 * Feature 004 Phase 5 — Data residency compliance utility.
 * Used by LLM routers and processing pipelines to enforce regional constraints.
 */

import type { DataRegion } from '@/lib/db/schemas/agency-hierarchy';

export type ResidencyActionType =
  | 'llm_inference'
  | 'vector_storage'
  | 'analytics_export'
  | 'cross_region_replication';

const REGION_ALLOWED_ACTIONS: Record<DataRegion, ResidencyActionType[]> = {
  eu: ['llm_inference', 'vector_storage', 'analytics_export'],
  mena: ['llm_inference', 'vector_storage', 'analytics_export'],
  us: ['llm_inference', 'vector_storage', 'analytics_export', 'cross_region_replication'],
};

const EU_ONLY_PROVIDERS = ['openrouter/eu', 'azure-eu', 'dify-eu'];
const MENA_ONLY_PROVIDERS = ['openrouter/mena', 'azure-uae', 'dify-mena'];

export type RegionComplianceInput = {
  tenantRegion: DataRegion;
  actionType: ResidencyActionType;
  providerRegion?: DataRegion | 'global';
};

export type RegionComplianceResult = {
  compliant: boolean;
  reason?: string;
  requiredRegion: DataRegion;
};

export function isRegionCompliant(
  tenantRegion: DataRegion,
  actionType: ResidencyActionType,
  providerRegion?: DataRegion | 'global',
): RegionComplianceResult {
  const allowed = REGION_ALLOWED_ACTIONS[tenantRegion] ?? [];
  if (!allowed.includes(actionType)) {
    return {
      compliant: false,
      reason: `Action "${actionType}" is not permitted in region "${tenantRegion}"`,
      requiredRegion: tenantRegion,
    };
  }

  if (providerRegion && providerRegion !== 'global' && providerRegion !== tenantRegion) {
    return {
      compliant: false,
      reason: `Provider region "${providerRegion}" does not match tenant region "${tenantRegion}"`,
      requiredRegion: tenantRegion,
    };
  }

  if (actionType === 'cross_region_replication' && tenantRegion !== 'us') {
    return {
      compliant: false,
      reason: 'Cross-region replication is restricted to US tenants by default policy',
      requiredRegion: tenantRegion,
    };
  }

  return { compliant: true, requiredRegion: tenantRegion };
}

export function filterProvidersForRegion<T extends { id: string; region?: DataRegion | 'global' }>(
  tenantRegion: DataRegion,
  providers: T[],
): T[] {
  return providers.filter((provider) => {
    const check = isRegionCompliant(tenantRegion, 'llm_inference', provider.region ?? 'global');
    return check.compliant;
  });
}

export function assertRegionCompliant(input: RegionComplianceInput): void {
  const result = isRegionCompliant(input.tenantRegion, input.actionType, input.providerRegion);
  if (!result.compliant) {
    throw new Error(result.reason ?? 'Data residency violation');
  }
}

export const dataResidencyUtils = {
  isRegionCompliant,
  filterProvidersForRegion,
  assertRegionCompliant,
  EU_ONLY_PROVIDERS,
  MENA_ONLY_PROVIDERS,
};
