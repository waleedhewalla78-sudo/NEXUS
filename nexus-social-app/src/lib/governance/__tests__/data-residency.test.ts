import { describe, expect, it } from 'vitest';
import { isRegionCompliant, assertRegionCompliant } from '@/lib/governance/data-residency';

describe('data residency', () => {
  it('defaults existing tenants to us-compatible actions', () => {
    const result = isRegionCompliant('us', 'llm_inference');
    expect(result.compliant).toBe(true);
  });

  it('blocks cross-region replication for EU tenants', () => {
    const result = isRegionCompliant('eu', 'cross_region_replication');
    expect(result.compliant).toBe(false);
    expect(result.reason).toContain('not permitted in region "eu"');
  });

  it('requires provider region to match tenant for MENA', () => {
    const result = isRegionCompliant('mena', 'llm_inference', 'us');
    expect(result.compliant).toBe(false);
    expect(result.reason).toContain('does not match');
  });

  it('throws on residency violation via assertRegionCompliant', () => {
    expect(() =>
      assertRegionCompliant({
        tenantRegion: 'eu',
        actionType: 'cross_region_replication',
      }),
    ).toThrow(/not permitted in region|residency/i);
  });
});
