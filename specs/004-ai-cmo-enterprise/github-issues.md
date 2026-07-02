# GitHub Issues — Feature 004 Post-Launch (S15–S17)

**Generated:** 2026-06-25  
**Import:** `gh auth login` then run commands below, or create manually from templates.  
**Labels:** `feature-004`, `post-launch`, `sprint-15|16|17`

---

## Sprint 15

### Issue 1: Radar Agent — External Signal Ingestion (H5)

```bash
gh issue create --title "[004-S15] Radar: wire 003 listening data → signal.detected" \
  --label "feature-004,post-launch,sprint-15" \
  --body "$(cat <<'EOF'
## Gap ID
H5

## User Story
US-007

## Tasks
T021, T022, T023

## Acceptance Criteria
- [ ] Radar consumes 003 mentions/listening_queries (no stub-feed default)
- [ ] Emits ai-cmo/signal.detected within 5 min of ingest
- [ ] Unit tests in agents/__tests__/radar-agent.test.ts
- [ ] No direct SoR writes from agent

## Files
- nexus-social-app/src/lib/ai-cmo/agents/radar-agent.ts
- nexus-social-app/src/bin/worker.ts

## Dependencies
V1.0 marketing event consumer (closed)
EOF
)"
```

### Issue 2: Qdrant Production Implementation (C6, L3)

```bash
gh issue create --title "[004-S15] Qdrant: production hybrid memory + VectorStore abstraction" \
  --label "feature-004,post-launch,sprint-15,priority-critical" \
  --body "## Gap ID: C6, L3\n\n## Tasks: T025–T028\n\n## AC\n- Replace qdrant-client.stub.ts\n- Real embeddings + ws_{id}_learnings upsert\n- MemoryRepository merge/dedupe\n- VectorStore interface with PG fallback"
```

### Issue 3: Channel Risk Heatmap API (M6)

```bash
gh issue create --title "[004-S15] Channel Risk API — GET /api/v1/ai-cmo/channel-risk" \
  --label "feature-004,post-launch,sprint-15" \
  --body "## Gap ID: M6\n\n## Task: T024\n\n## AC\n- Per-platform risk scores\n- Advisory only — does not override Policy Engine V2 CRITICAL routing"
```

---

## Sprint 16

### Issue 4: Finance Agent — Stripe ROI (M5)

```bash
gh issue create --title "[004-S16] Finance agent: Stripe/billing pipeline ROI" \
  --label "feature-004,post-launch,sprint-16" \
  --body "## Gap ID: M5 | US-009 | Tasks T030–T031"
```

### Issue 5: Sentinel + Quant Production (M7, M8)

```bash
gh issue create --title "[004-S16] Sentinel + Quant: time-series anomalies + analytics insights" \
  --label "feature-004,post-launch,sprint-16" \
  --body "## Gap IDs: M7, M8 | US-008 | Tasks T032–T035"
```

### Issue 6: Compliance MENA Legal Packs (H11)

```bash
gh issue create --title "[004-S16] Compliance agent: PDPL/DPL prompt packs" \
  --label "feature-004,post-launch,sprint-16" \
  --body "## Gap ID: H11 | Task T036 | Legal review required before GA"
```

### Issue 7: AI Ops Dashboard (H10)

```bash
gh issue create --title "[004-S16] AI Ops dashboard at /admin/ai-ops" \
  --label "feature-004,post-launch,sprint-16" \
  --body "## Gap ID: H10 | Task T039 | Langfuse + Inngest metrics"
```

### Issue 8: Knowledge Hub Expansion (M3)

```bash
gh issue create --title "[004-S16] Knowledge Hub: 3 new ingest source adapters" \
  --label "feature-004,post-launch,sprint-16" \
  --body "## Gap ID: M3 | Tasks T037–T038"
```

---

## Sprint 17

### Issue 9: Approval Inbox + Hierarchy UI (US-004, M11)

```bash
gh issue create --title "[004-S17] Productization UI — approval inbox + brand picker" \
  --label "feature-004,post-launch,sprint-17" \
  --body "## US-004, M9, M11 | Tasks T042–T044"
```

### Issue 10: Playwright E2E Campaign Smoke (M15)

```bash
gh issue create --title "[004-S17] Playwright E2E — campaign POST → poll → published" \
  --label "feature-004,post-launch,sprint-17,testing" \
  --body "## Gap ID: M15 | Task T045 | CI staging secrets required"
```

### Issue 11: Penetration Test — /api/inngest + AI CMO API (POST-SEC)

```bash
gh issue create --title "[004-S17] Post-deploy pentest: Inngest webhook + AI CMO API" \
  --label "feature-004,post-launch,sprint-17,security" \
  --body "## US-011 | Tasks T046–T047, T049\n\nScope:\n- POST/GET /api/inngest\n- /api/v1/ai-cmo/*\n- INNGEST_SIGNING_KEY validation\n- Execute on staging post-V1.0 deploy"
```

### Issue 12: Enterprise IdP SAML/SCIM (POST-B)

```bash
gh issue create --title "[004-S17] Enterprise SSO — SAML + SCIM provisioning" \
  --label "feature-004,post-launch,sprint-17,security" \
  --body "## US-010 | Task T048 | API key auth unchanged for automation"
```

---

## Bulk Create Script

Save as `scripts/New-Feature004-GitHubIssues.ps1` and run after `gh auth login`:

```powershell
# Requires: gh CLI authenticated
$issues = @(
  @{ title="[004-S15] Radar: 003 listening → signal.detected"; body="H5 US-007 T021-T023" },
  @{ title="[004-S15] Qdrant production hybrid memory"; body="C6 L3 T025-T028" }
  # ... add remaining from above
)
foreach ($i in $issues) {
  gh issue create --title $i.title --body $i.body --label "feature-004,post-launch"
}
```

**Note:** GitHub CLI was not authenticated at generation time. Run `gh auth login` first.
