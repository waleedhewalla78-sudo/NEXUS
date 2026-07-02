# Specification Quality Checklist: Real Integrations & Production Readiness

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-06-23
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- Derived from June 2026 project status (~70% demo-ready, Potemkin Village gap) and expert analysis four-epic roadmap.
- Phase 1 prioritizes Epic 1 (Real Publishing) + Epic 3 (Schema/DevOps); Phase 2 Epic 2 + 4; Phase 3 reputation, AI, UX.
- Meta App Review documented as business blocker; mobile and new dashboards explicitly out of near-term scope.
- Consolidated with implementation artifacts from former `specs/003-production-saas/` (plan, research, data-model, quickstart, 20 completed tasks).
- UX parity checklist added under `checklists/requirements.md` § UX Table Stakes (T052).
- Ready for production UAT (Phase 4) — Meta publish remains gated on `meta_app_review_status`.

## UX Table Stakes (T052 — Buffer/Hootsuite parity)

| # | Flow | Nexus (post-003) | Pass? |
|---|------|------------------|-------|
| 1 | OAuth connect per network | Settings → Connect OAuth for LinkedIn/X/Meta | ✓ |
| 2 | Publish failure visibility | Calendar failure panel + toast with reconnect | ✓ |
| 3 | Retry failed publish | Calendar retry action | ✓ |
| 4 | Drag-reschedule | Calendar eventDrop → `scheduled_at` update | ✓ |
| 5 | Composer character limits | Per-platform validation in PostFormContent | ✓ |
| 6 | Composer media rules | Instagram requires image enforced | ✓ |
| 7 | Real analytics (no demo in prod) | getAnalytics throws/empty; dashboard partial state | ✓ |
| 8 | Meta publish gate | `meta_app_review_status` blocks worker | ✓ |
| 9 | AI preflight banner | AiVerifyBanner on composer + AI settings | ✓ |
| 10 | Reputation config | Reputation settings for competitor/owned targets | ✓ |

**Score: 10/10** for implemented checklist items. Live OAuth UAT and Meta production publish remain operator-dependent.
