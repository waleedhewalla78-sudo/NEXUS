# Create GitHub Issues from Feature 004 Tasks

**Generated:** 2026-06-23  
**Sources:** `nexus-social-app/specs/004-ai-cmo-master-prd-v3/tasks.md`, `IMPLEMENT_PLAN_ALL_OPEN.md`  
**Speckit:** `.github/agents/speckit.taskstoissues.agent.md`, `speckit-src/spec-kit-0.11.3/templates/commands/taskstoissues.md`  
**Note:** `tasks-sprint14-17.md` was not found; sprint tasks are in `tasks.md` + `IMPLEMENT_PLAN_ALL_OPEN.md`.

## Prerequisites (manual — gh not available in agent session)

1. Install [GitHub CLI](https://cli.github.com/): Windows installer or `choco install gh`.
2. Authenticate:
   ```powershell
   gh auth login
   gh auth status
   ```
3. Set repository (no `remote.origin.url` was configured at repo root during conversion):
   ```powershell
   $env:GITHUB_REPO = "YOUR_ORG/nexus-social-platform"   # adjust
   cd D:\nexus-social-platform
   # or: gh repo set-default YOUR_ORG/nexus-social-platform
   ```

## Automated run (recommended)

From repo root:

```powershell
cd D:\nexus-social-platform
$env:GITHUB_REPO = "YOUR_ORG/nexus-social-platform"
.\scripts\create-github-issues-from-tasks.ps1 -DryRun   # preview
.\scripts\create-github-issues-from-tasks.ps1           # create up to 30 priority issues
.\scripts\create-github-issues-from-tasks.ps1 -UpdateTasksMd   # patch tasks.md with (#NNN)
```

## Labels (create once)

```powershell
$repo = $env:GITHUB_REPO
$labels = @(
  "feature-004","feature-003","blocked","deferred","ai-cmo","launch-uat",
  "phase-a","phase-b","phase-c","phase-d","phase-e","phase-f","phase-g","phase-h",
  "sprint-13","sprint-14","sprint-15","sprint-16","sprint-17"
)
foreach ($l in $labels) {
  gh label create $l --repo $repo --force 2>$null
}
```

## Milestone

```powershell
gh api repos/$env:GITHUB_REPO/milestones -f title="Feature 004 Implementation" -f description="AI CMO Phase A-H (gates, orchestration, memory, FinOps, governance, observability, agents, launch)" 2>$null
# Or use existing: gh milestone list --repo $env:GITHUB_REPO
```

## Deduplication

Before each create, search open+closed issues:

```powershell
gh issue list --repo $env:GITHUB_REPO --search "A-GATE-001 in:title" --state all --limit 5
```

Skip if title matches `\[A-GATE-001\]` or contains task ID.

## Priority batch (max 30 — implemented in `.ps1`)

| Order | ID | Title prefix |
|------:|-----|--------------|
| 1-5 | A-GATE-001 … A-GATE-005 | Phase A leadership gates |
| 6 | C-MEM-001 | Apply migration 000013 (operator) |
| 7-8 | S14-T002, B-ORCH-007 | Campaign → post_id wiring |
| 9 | S14-T001 | Inngest + API route |
| 10 | S13-T012 | Dify publish |
| 11-14 | B-ORCH-001, B-ORCH-002, B-ORCH-005, B-ORCH-008 | Orchestration |
| 15-16 | C-MEM-003, C-MEM-004 | Outcomes + Optimizer loop |
| 17-19 | D-FIN-001, D-FIN-004, D-FIN-005 | FinOps / MV / attribution |
| 20-21 | E-GOV-001, E-GOV-004 | Approval queue + LLM judge |
| 22-23 | F-OBS-004, F-OBS-007 | Circuit breaker + rate limits |
| 24-25 | H-PROD-001, H-PROD-004 | Agency migration + E2E smoke |
| 26-28 | T057, T053, T054 | Feature 003 launch (label `feature-003`) |
| 29 | S14-T004 | MV refresh cron |
| 30 | G-AGENT-007 | Event-driven replan production |

**Skipped from batch (done/partial):** B-ORCH-003 (done), S14-T003/T005/T006/T007/T008/T009/T010 (partial or done), all `[x]` items in `tasks.md`.

**Remainder:** see `nexus-social-app/specs/004-ai-cmo-master-prd-v3/issues-backlog.md`.

## Issue body template

Each issue body includes:

- **Task ID**, Phase, User story (spec link)
- **Description** and **Acceptance criteria** (from IMPLEMENT_PLAN)
- **Verification:** `npm run typecheck`, `npm test`, `npm run schema:verify:004`, etc.
- **Blocker:** CL-ID or dependency task
- **Spec links:** relative paths in repo
- **Size:** S/M/L estimate

Example manual create:

```powershell
gh issue create --repo $env:GITHUB_REPO `
  --title "[B-ORCH-007] Wire campaign to post via reconciler (post_id FK)" `
  --label "feature-004,phase-b,sprint-14,ai-cmo" `
  --milestone "Feature 004 Implementation" `
  --body-file "scripts/issue-bodies/B-ORCH-007.md"
```

## Feature 003 optional issues

Create with label `feature-003` (+ `deferred` for T024):

- `[T024]` Playwright publish E2E (deferred)
- `[T053]` Phase 1 UAT
- `[T055]` Phase 2 analytics smoke
- `[T056]` Full-stack walkthrough

(T053/T054/T057 included in priority batch above.)

## After creation

1. Run `.\scripts\create-github-issues-from-tasks.ps1 -UpdateTasksMd` to add `(#issue)` next to matching lines in `tasks.md`.
2. Re-run script safely; duplicates are skipped via title search.

## Agent session result (2026-06-23)

| Check | Result |
|-------|--------|
| `gh auth status` | **Not run** — `gh` not on PATH; winget unavailable |
| Issues created | **0** |
| `tasks.md` issue links | **Not updated** (no issue numbers) |
| Backlog | `nexus-social-app/specs/004-ai-cmo-master-prd-v3/issues-backlog.md` |
