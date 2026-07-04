/**
 * Sprint 2 — env-based feature flags (no third-party flag service).
 * NEXT_PUBLIC_* values are inlined at build time for client components.
 */

export function isSaasUiEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_SaaS_UI === 'true';
}

export function isEnterpriseLandingEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_ENTERPRISE_LANDING === 'true';
}
