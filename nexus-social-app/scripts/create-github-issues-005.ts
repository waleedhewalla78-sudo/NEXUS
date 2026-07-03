/**
 * Create GitHub issues from Feature 005 tasks.md (Sprint 18–19)
 * Usage: npm run speckit:issues-005 [-- --repo owner/name]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const backlogPath = join(root, 'specs/005-enterprise-revenue-loop/issues-backlog.md');

type IssueDef = {
  id: string;
  title: string;
  body: string;
  labels: string[];
  close?: boolean;
};

const ISSUES: IssueDef[] = [
  // Sprint 18 — completed (audit trail)
  {
    id: 'P005-S18-T001',
    title: '[005][DONE] Migration abm_playbook_runs + RLS',
    body: 'Apply `supabase/migrations/20260701_abm_playbook_runs.sql`\n\nVerify: `npm run uat:check-schema`',
    labels: ['feature-005', 'sprint-18', 'status-done'],
    close: true,
  },
  {
    id: 'P005-S18-T003',
    title: '[005][DONE] ABM activate-playbook.ts',
    body: 'Intent → campaign job enqueue + reconciler persist\n\nFR-056, FR-057',
    labels: ['feature-005', 'sprint-18', 'status-done'],
    close: true,
  },
  {
    id: 'P005-S18-T004',
    title: '[005][DONE] POST abm/accounts/[id]/activate API',
    body: 'REST activation endpoint with API key + session auth\n\nFR-059',
    labels: ['feature-005', 'sprint-18', 'status-done'],
    close: true,
  },
  {
    id: 'P005-S18-T005',
    title: '[005][DONE] ABM dashboard Activate playbook button',
    body: 'UI trigger from /ai-cmo/abm account cards\n\nUS-021',
    labels: ['feature-005', 'sprint-18', 'status-done'],
    close: true,
  },
  {
    id: 'P005-S18-T007',
    title: '[005][DONE] Agent control plane API',
    body: 'GET /api/v1/ai-cmo/agents/control-plane\n\nFR-064',
    labels: ['feature-005', 'sprint-18', 'status-done'],
    close: true,
  },
  {
    id: 'P005-S18-T008',
    title: '[005][DONE] /ai-cmo/control-plane UI',
    body: 'Operator dashboard for 8-agent mesh\n\nFR-065, US-023',
    labels: ['feature-005', 'sprint-18', 'status-done'],
    close: true,
  },
  {
    id: 'P005-S18-T011',
    title: '[005] Sprint 18 gate — typecheck + unit + ABM verify',
    body: 'Run: `npm run typecheck && npm run test:unit && npm run verify:abm-seed && npm run uat:check-schema`\n\nAll must pass before Sprint 18 close.',
    labels: ['feature-005', 'sprint-18'],
  },
  {
    id: 'P005-S18-T012',
    title: '[005] Extend verify-abm-seed activation smoke',
    body: 'Optional POST activate smoke in `scripts/verify-abm-seed.ts`\n\nUS-021',
    labels: ['feature-005', 'sprint-18'],
  },
  {
    id: 'P005-S18-T013',
    title: '[005][DONE] Wire live ABM page (AbmDashboardClient)',
    body: 'Replace static mocks on `/ai-cmo/abm` with live API client + activate\n\nCVG-005-001',
    labels: ['feature-005', 'sprint-18', 'status-done'],
    close: true,
  },
  // Sprint 19 — CRM + MENA
  {
    id: 'P005-S19-T001',
    title: '[005] HubSpot webhook CRM sync + HMAC',
    body: 'POST `/api/integrations/crm/webhook/hubspot` with signature verify\n\nFR-060, NFR-015, US-022',
    labels: ['feature-005', 'sprint-19'],
  },
  {
    id: 'P005-S19-T002',
    title: '[005] HubSpot batch deal sync script',
    body: '`scripts/sync-hubspot-deals.ts` — manual pull for demo\n\nFR-060, CL-026',
    labels: ['feature-005', 'sprint-19'],
  },
  {
    id: 'P005-S19-T003',
    title: '[005] Domain link CRM → intent scores in attribution',
    body: 'Join `crm_activity_mirror.account_domain` to `account_intent_scores.domain`\n\nFR-061',
    labels: ['feature-005', 'sprint-19'],
  },
  {
    id: 'P005-S19-T004',
    title: '[005] Executive export CRM closed-won totals',
    body: 'Include CRM-sourced closed-won in executive attribution export\n\nFR-062',
    labels: ['feature-005', 'sprint-19'],
  },
  {
    id: 'P005-S19-T005',
    title: '[005] HubSpot OAuth connection stub (settings UI)',
    body: 'Workspace settings placeholder for HubSpot credentials\n\nUS-029',
    labels: ['feature-005', 'sprint-19'],
  },
  {
    id: 'P005-S19-T006',
    title: '[005] Salesforce sync adapter (mirror schema)',
    body: 'SFDC closed-won → `crm_activity_mirror`\n\nFR-063, US-030',
    labels: ['feature-005', 'sprint-19'],
  },
  {
    id: 'P005-S19-T007',
    title: '[005] MENA compliance profile pack',
    body: '`compliance-profiles/mena-v1.ts` rule catalog\n\nFR-067, US-024',
    labels: ['feature-005', 'sprint-19'],
  },
  {
    id: 'P005-S19-T008',
    title: '[005] Workspace compliance profile toggle API + UI',
    body: 'Settings toggle for `mena_v1` profile\n\nFR-067',
    labels: ['feature-005', 'sprint-19'],
  },
  {
    id: 'P005-S19-T009',
    title: '[005] Compliance agent injection + audit PDF attestation',
    body: 'Inject MENA rules into compliance agent; PDF attestation\n\nFR-068, FR-069',
    labels: ['feature-005', 'sprint-19'],
  },
  {
    id: 'P005-S19-T010',
    title: '[005] Control plane last-audit per agent',
    body: 'Show last audit action per agent category on control plane\n\nFR-066',
    labels: ['feature-005', 'sprint-19'],
  },
];

function parseRepoArg(): string | undefined {
  const idx = process.argv.indexOf('--repo');
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
  return process.env.GITHUB_REPOSITORY ?? 'waleedhewalla78-sudo/NEXUS';
}

function ensureLabels(repo: string, labels: string[]) {
  for (const label of labels) {
    try {
      execSync(`gh label create "${label}" --repo ${repo} --color "1d76db" --force`, {
        encoding: 'utf8',
        stdio: 'pipe',
      });
    } catch {
      // label may already exist with different color
    }
  }
}

async function main() {
  const repo = parseRepoArg() ?? 'waleedhewalla78-sudo/NEXUS';
  const results: string[] = [
    '# GitHub Issues Backlog — Feature 005',
    '',
    `**Updated:** ${new Date().toISOString().slice(0, 10)}`,
    `**Repo:** ${repo}`,
    '',
    '| Task ID | Issue | Title | Status |',
    '|---------|-------|-------|--------|',
  ];

  ensureLabels(repo, [
    'feature-005',
    'sprint-18',
    'sprint-19',
    'status-done',
  ]);

  for (const issue of ISSUES) {
    try {
      const labelArgs = issue.labels.map((l) => `--label "${l}"`).join(' ');
      const bodyEscaped = issue.body.replace(/"/g, '\\"').replace(/\n/g, '\\n');
      const titleEscaped = issue.title.replace(/"/g, '\\"');
      const cmd = `gh issue create --repo ${repo} --title "${titleEscaped}" --body "${bodyEscaped}" ${labelArgs}`;
      const url = execSync(cmd, { encoding: 'utf8' }).trim();
      const num = url.match(/\/issues\/(\d+)/)?.[1] ?? '?';

      if (issue.close && num !== '?') {
        execSync(`gh issue close ${num} --repo ${repo} --comment "Completed in codebase."`, {
          encoding: 'utf8',
          stdio: 'pipe',
        });
      }

      const status = issue.close ? 'closed' : 'open';
      results.push(`| ${issue.id} | #${num} | ${issue.title} | ${status} |`);
      console.log(`Created ${issue.id} → ${url} (${status})`);
    } catch (err) {
      results.push(`| ${issue.id} | FAILED | ${issue.title} | — |`);
      console.error(`Failed ${issue.id}:`, err);
    }
  }

  writeFileSync(backlogPath, results.join('\n'));
  console.log('[speckit:issues-005] Updated issues-backlog.md');
}

main();
