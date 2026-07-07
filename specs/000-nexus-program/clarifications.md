# Program Clarifications — Speckit `/speckit.clarify`

**Date:** 2026-06-27  
**Supersedes ambiguities from:** pre-deployment analysis, external artifact review, UAT runs

---

## CL-006-001 — External Claude artifacts

**Question:** Should Prompt Genius, Campaign Intelligence, Content Calendar, Higgsfield be copied as standalone React apps?

**Decision:** **No.** Extract **ideas only** — implement as Nexus-native APIs, pages, and agent extensions under existing auth, SoR, and Inngest. Feature 005 defines the integration pattern.

---

## CL-006-002 — Inngest approval (A-GATE-001)

**Question:** Is Inngest still blocked?

**Decision:** **No (code complete).** `inngest` npm package installed; 8 functions registered. Production requires Inngest Cloud account + signing keys (DevOps).

---

## CL-006-003 — UAT cannibalization failures

**Question:** Why does live integration fail after schema fix?

**Decision:** **Uniqueness guard working correctly.** Repeat runs accumulate similar captions in `ai_cmo_content_pieces`. UAT scripts call `clearUatContentCorpus()` + `buildUniqueUatObjective()` (random topic + run token) before happy-path tests.

---

## CL-006-004 — TikTok / Snapchat publish

**Question:** Are all social platforms supported?

**Decision:** **Publish:** Facebook, Instagram, LinkedIn, X only. **Content planning** may reference other platforms in Creator output; **publish adapters** for TikTok/Snapchat are **FR-P01** backlog.

---

## CL-006-005 — Customer support agent

**Question:** Is there a dedicated “support agent” product?

**Decision:** **Inbox AI via Chatwoot** (`ai-orchestration.ts`) + Copilot `inbox_reply` intent. Not a separate trained model; uses Ollama/Dify with workspace config. Escalation = Chatwoot human handoff.

---

## CL-006-006 — audit_logs table

**Question:** Workflow logs “audit_logs not in schema cache” — blocker?

**Decision:** **Medium priority.** Workflow continues; audit writes fail silently. Apply `RUN_IN_SQL_EDITOR_UAT_AUDIT_LOGS.sql` before production.

---

## CL-006-007 — Production go-live definition

**Question:** Is “58/58 tasks complete” sufficient for production?

**Decision:** **No.** Production requires **FR-D01–D05** (live UAT + 003 operator gates + sign-off). Architecture complete ≠ live traffic proven.

---

## CL-006-008 — Path alias for operators

**Question:** Playbook says `E:\AISOP\nexus-social-app`?

**Decision:** Use **`e:\nexus-social-platform\nexus-social-app`** unless local symlink exists. Commands identical.

---

## CL-031 — Enterprise skin (Sprint 2)

**Decision:** Use `NEXT_PUBLIC_ENABLE_SaaS_UI` and `NEXT_PUBLIC_ENABLE_ENTERPRISE_LANDING` env flags — not a separate deployable app. Integrations remain reachable at `/settings/integrations` when SaaS chrome is hidden.

---

## CL-032 — Meta Lead Ads vs App Review

**Decision:** Lead Ads webhook ingest (`/api/v1/enterprise/leads/meta-ads`) does **not** require Meta App Review. B1 / T057 only blocks **publish** to Facebook/Instagram.

---

## CL-033 / CL-034 — Pilot onboarding (Sprint 4)

**Decision:** High-touch only. Service-role provision script + manual `workspace_members`. **No self-serve onboarding UI.** Provision script (`S4-ENG-001`) is implemented **only after** a signed pilot and explicit `CLIENT_NAME` / `CLIENT_SLUG` / `CLIENT_DOMAIN`.

---

## CL-036 — Sprint 6 Pit Crew (payment gate)

**Decision:** Do **not** implement `/admin` provision API, `agency_client_roster`, or margin dashboard until Client #1 has been **invoiced and paid**. Unlock phrase: **Sprint 6 Ready**.

---

## CL-037 — S4 script vs S6 API

**Decision:** Sprint 4 CLI provisioner and Sprint 6 admin API are alternate onboarding paths. Shipping S6 API can supersede S4 CLI; do not build both until payment unlocks S6.

---

## CL-038 — Sprint 7 intelligence funnel

**Decision:** No native GA4 / Meta Ads / WhatsApp **sync workers**. Ingest via CSV upload and existing Meta Lead Ads webhook. AI produces executive briefs (text-only feed V1).

---

## CL-039 — Intelligence write path

**Decision:** Use `src/lib/intelligence/ingest-raw.ts` and briefing agent — **do not** modify `reconciler.ts` or `secure-reconciler-writer.ts` (CL-030).

---

## CL-040 — Intelligence UI V1

**Decision:** Text-heavy timeline only. No chart libraries. PDF download is P2 backlog.

---

## CL-041 — Enterprise root route (production closure)

**Decision:** When `NEXT_PUBLIC_ENABLE_SaaS_UI !== 'true'`, server component at `/` calls `redirect('/intelligence')`. SaaS dashboard remains at `/` when flag is `true`.

---

## CL-042 — QA harness unit test flake

**Decision:** `qa:enterprise` runs `test:unit` first with up to 3 attempts. If ≤1 Vitest failure under harness load, status = **WARN** not FAIL. Isolated `npm run test:unit` remains authoritative for regressions.

---

## CL-043 — GHCR Docker build path

**Decision:** `.github/workflows/docker-build.yml` uses `context: ./nexus-social-app` and `file: Dockerfile` (not `./nexus-social-app/Dockerfile`).

---

## CL-044 — Phase D gate automation boundary

**Question:** Can B1–B3 human gates be closed by engineering?

**Decision:** **No.** B1 (Meta App Review), B2 (live OAuth connect), B3 (executive names), S5/S6 (commercial) require human operators. Engineering ships **`verify:phase-d`**, **`.env.production.template`**, and **`OPS-PHASE-D-INTEGRATION.md`** with integration alternatives. Script reports `HUMAN` status — never auto-passes human gates.

---

## CL-045 — Production LLM default

**Question:** Should Ollama run on Hermes VPS (8GB RAM)?

**Decision:** **No.** Production uses **Dify → OpenRouter** (`USE_LOCAL_OLLAMA=false`). Ollama remains dev/UAT only. OpenRouter-only fallback acceptable if Dify unavailable (Option B in Phase D integration guide).

---

## CL-046 — Social UAT fast path

**Question:** Must all four platforms pass T053 before any production traffic?

**Decision:** **No.** **LinkedIn + X** can certify publish path while B1 (Meta) is pending. Meta Lead Ads ingest works without App Review (CL-032). FB/IG publish remains blocked until `meta_app_review_status=approved`.

---

## CL-047 — Phase D verifier exit code

**Decision:** `verify:phase-d` exits **1** only on automated **FAIL** (missing required secrets, no approved Meta workspace when checking prod DB). **HUMAN** gates do not fail the script — they are reported for operator action.

---

## Open questions (non-blocking)

| ID | Question | Owner |
|----|----------|-------|
| OQ-004 | Postman B timeout — budget fail vs long Ollama run when Test A concurrent | Eng |
| OQ-005 | Intelligence dashboard: persist imports vs ephemeral JSON | Product |
| OQ-006 | Calendar export: from `ai_cmo_content_pieces` only vs include drafts | Product |
