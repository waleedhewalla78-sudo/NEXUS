import { describe, expect, it, afterEach, vi } from 'vitest';
import { isEnterpriseLandingEnabled, isSaasUiEnabled } from '@/lib/feature-flags';

describe('feature-flags', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('treats SaaS UI as off unless explicitly true', () => {
    vi.stubEnv('NEXT_PUBLIC_ENABLE_SaaS_UI', 'false');
    expect(isSaasUiEnabled()).toBe(false);
    vi.stubEnv('NEXT_PUBLIC_ENABLE_SaaS_UI', 'true');
    expect(isSaasUiEnabled()).toBe(true);
  });

  it('treats enterprise landing as on only when true', () => {
    vi.stubEnv('NEXT_PUBLIC_ENABLE_ENTERPRISE_LANDING', 'true');
    expect(isEnterpriseLandingEnabled()).toBe(true);
    vi.stubEnv('NEXT_PUBLIC_ENABLE_ENTERPRISE_LANDING', 'false');
    expect(isEnterpriseLandingEnabled()).toBe(false);
  });
});
