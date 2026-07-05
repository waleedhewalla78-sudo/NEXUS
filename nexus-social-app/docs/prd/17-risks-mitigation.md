# 17. Risks & Mitigation

← [PRD Index](./README.md) · [PRD Status](./PRD-STATUS.md)

---

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Prod DB migrations lag code | High | High | Apply `20260705` + `20260715`; re-run QA |
| Meta publish blocked long-term | High | Med | Lead Ads + LinkedIn for GTM |
| 8GB RAM if native sync built | High | Low | CL-038 funnel model in constitution |
| Pilot doesn't convert | High | Med | Sprint 5 ROI PDF; attribution UI |
| LLM provider outage | Med | Med | Fallback copy in briefing + pilot script |
| Unit test flake under load | Low | Med | Isolate `test:unit`; mock circuit breaker |
| Scope creep (dashboard trap) | High | Med | CL-040 text-only intelligence V1 |
| Cross-tenant data leak | Critical | Low | RLS + QA schema verify |
| Founder onboarding bottleneck | Med | High | Sprint 6 after payment |
| GHCR image stale on VPS | Med | Med | `docker compose pull` on deploy |
| Docker container lacks scripts | Med | High | Document VPS host execution for CLIs |
| Executive sign-off delay | Med | Med | `UAT-SIGNOFF-RESULTS.md` tracking |

---

## Risk register IDs

| ID | Risk | Owner |
|----|------|-------|
| R-OPS-01 | Intelligence migration not applied | Operator |
| R-QA-01 | Unit test FAIL in harness | Engineering |
| R-COM-01 | No paid Client #1 | Commercial |
| R-COM-02 | No signed pilot for S4 | Commercial |
| R-SEC-01 | B4 prod secrets incomplete | DevOps |
| R-PROD-01 | B1 Meta blocks FB/IG publish | Product |

---

*Review quarterly or after each sprint gate.*
