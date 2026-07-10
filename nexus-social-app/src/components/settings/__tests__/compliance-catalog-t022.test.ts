import { describe, expect, it } from 'vitest';
import { COMPLIANCE_PROFILE_CATALOG } from '@/lib/governance/compliance-profiles/mena-v1';

/**
 * T022 — Settings → Compliance UI is driven by getComplianceProfileSettings()
 * which returns COMPLIANCE_PROFILE_CATALOG. Catalog must include conversational profile.
 */
describe('T022 Compliance Settings catalog', () => {
  it('catalog powers Settings UI with mena_conversational_v1', () => {
    const options = Object.values(COMPLIANCE_PROFILE_CATALOG);
    expect(options.map((o) => o.id)).toEqual(
      expect.arrayContaining(['global_default', 'mena_v1', 'mena_conversational_v1']),
    );
    const conversational = COMPLIANCE_PROFILE_CATALOG.mena_conversational_v1;
    expect(conversational.label).toMatch(/Conversational/i);
    expect(conversational.arabicRegister).toBe('dialect_allowed');
  });
});
