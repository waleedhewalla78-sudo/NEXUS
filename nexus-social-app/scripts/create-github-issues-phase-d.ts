#!/usr/bin/env tsx
/**
 * Create GitHub issues for Phase D operator/commercial tasks.
 * Usage: npm run speckit:issues-phase-d
 */
import { spawnSync } from 'node:child_process';

const issues: Array<{
  title: string;
  body: string;
  labels: string[];
}> = [
  {
    title: 'PD-OPS-001: Hermes deploy latest main',
    body: `## Summary
Deploy production closure commit to Hermes VPS.

## Steps
\`\`\`bash
cd /opt/platform && git pull origin main
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
\`\`\`

## Verify
\`npm run verify:phase-d -- --live\`

## Ref
- specs/000-nexus-program/phase-d-spec.md
- docs/OPS-PHASE-D-INTEGRATION.md`,
    labels: ['phase-d', 'human-gate', 'devops'],
  },
  {
    title: 'PD-OPS-002: Fill production secrets vault (B4)',
    body: `## Summary
Copy \`.env.production.template\` → \`.env.production\` on VPS and fill all \`\${PROD_*}\` values.

## Checklist
docs/OPS-PROD-SECRETS-CHECKLIST.md

## Verify
\`npm run verify:phase-d\` — B4 keys SET`,
    labels: ['phase-d', 'human-gate', 'devops'],
  },
  {
    title: 'PD-OPS-003: Inngest Cloud production sync',
    body: `## Summary
Sync Inngest app to https://nexussocial.tech/api/inngest

## Env
INNGEST_SIGNING_KEY, INNGEST_EVENT_KEY

## Verify
\`npm run verify:inngest-cloud\``,
    labels: ['phase-d', 'devops'],
  },
  {
    title: 'PD-OPS-004: Confirm publish worker container running',
    body: `## Summary
Ensure \`nexus-social-worker\` from docker-compose.prod.yml is healthy.

## Verify
\`docker compose ps\` — worker running
Schedule test post → published status`,
    labels: ['phase-d', 'devops'],
  },
  {
    title: 'PD-OPS-005: B2 OAuth UAT — LinkedIn + X on live URL',
    body: `## Summary
Connect LinkedIn and X at https://nexussocial.tech/settings

## Runbook
docs/OPS-OAUTH-UAT-RUNBOOK.md

## Record
docs/UAT-SIGNOFF-RESULTS.md T053`,
    labels: ['phase-d', 'human-gate', 'qa'],
  },
  {
    title: 'PD-OPS-006: B1 Meta App Review submission',
    body: `## Summary
Submit Meta App Review for FB/IG publish permissions.

## Runbook
docs/OPS-META-APP-REVIEW.md

## Note
Lead Ads ingest works without review (CL-032)`,
    labels: ['phase-d', 'human-gate', 'product'],
  },
  {
    title: 'PD-OPS-007: Set meta_app_review_status=approved',
    body: `## Summary
After Meta approval, update workspace in Supabase and connect Meta OAuth.

## Verify
\`npm run verify:phase-d\` — B1-db PASS`,
    labels: ['phase-d', 'human-gate', 'product'],
  },
  {
    title: 'PD-OPS-008: B3 Executive sign-off',
    body: `## Summary
Product + CTO + Compliance sign docs/UAT-SIGNOFF-RESULTS.md

## Prerequisite
close-section-b.ps1 PASS`,
    labels: ['phase-d', 'human-gate', 'leadership'],
  },
  {
    title: 'PD-OPS-009: Phase 3 QA vs nexussocial.tech',
    body: `## Summary
Re-run enterprise QA harness against live production URL.

\`\`\`
NEXT_PUBLIC_APP_URL=https://nexussocial.tech npm run qa:enterprise:report
\`\`\``,
    labels: ['phase-d', 'qa'],
  },
  {
    title: 'PD-COM-001: Generate pilot report on prod workspace',
    body: `## Summary
On VPS host (not container):
\`\`\`bash
PILOT_WORKSPACE_ID=<uuid> npm run generate:pilot-report
\`\`\``,
    labels: ['phase-d', 'commercial', 'founder'],
  },
  {
    title: 'PD-COM-003: Client #1 payment — unlock Sprint 6',
    body: `## Summary
Invoice and payment for first agency client.

## Unlock
Reply **Sprint 6 Ready** to enable Pit Crew build (CL-036)`,
    labels: ['phase-d', 'commercial', 'founder'],
  },
];

function main() {
  for (const issue of issues) {
    const labelArgs = issue.labels.flatMap((l) => ['--label', l]);
    const result = spawnSync(
      'gh',
      ['issue', 'create', '--title', issue.title, '--body', issue.body, ...labelArgs],
      { stdio: 'inherit', cwd: process.cwd() },
    );
    if (result.status !== 0) {
      console.error(`Failed: ${issue.title}`);
    }
  }
  console.log('\nDone. List: gh issue list --label phase-d');
}

main();
