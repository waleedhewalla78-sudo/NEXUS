/**
 * Create GitHub issues from Feature 005 tasks.md
 * Usage: npm run speckit:issues-005 [-- --repo owner/name]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tasksPath = join(root, 'specs/005-enterprise-revenue-loop/tasks.md');
const backlogPath = join(root, 'specs/005-enterprise-revenue-loop/issues-backlog.md');

const ISSUES: { id: string; title: string; body: string; labels: string[] }[] = [
  {
    id: 'P005-S18-T001',
    title: '[005] Migration abm_playbook_runs + RLS',
    body: 'Apply `supabase/migrations/20260701_abm_playbook_runs.sql`\n\nVerify: `npm run uat:check-schema`',
    labels: ['feature-005', 'sprint-18'],
  },
  {
    id: 'P005-S18-T003',
    title: '[005] ABM activate-playbook.ts',
    body: 'Intent → campaign job enqueue + reconciler persist\n\nFR-056, FR-057',
    labels: ['feature-005', 'sprint-18'],
  },
  {
    id: 'P005-S18-T004',
    title: '[005] POST abm/accounts/[id]/activate API',
    body: 'REST activation endpoint with API key + session auth\n\nFR-059',
    labels: ['feature-005', 'sprint-18'],
  },
  {
    id: 'P005-S18-T005',
    title: '[005] ABM dashboard Activate playbook button',
    body: 'UI trigger from /ai-cmo/abm account cards\n\nUS-021',
    labels: ['feature-005', 'sprint-18'],
  },
  {
    id: 'P005-S18-T007',
    title: '[005] Agent control plane API',
    body: 'GET /api/v1/ai-cmo/agents/control-plane\n\nFR-064',
    labels: ['feature-005', 'sprint-18'],
  },
  {
    id: 'P005-S18-T008',
    title: '[005] /ai-cmo/control-plane UI',
    body: 'Operator dashboard for 8-agent mesh\n\nFR-065, US-023',
    labels: ['feature-005', 'sprint-18'],
  },
  {
    id: 'P005-S19-T001',
    title: '[005] HubSpot webhook CRM sync',
    body: 'POST /api/integrations/crm/webhook/hubspot with HMAC\n\nFR-060, Sprint 19',
    labels: ['feature-005', 'sprint-19'],
  },
  {
    id: 'P005-S19-T007',
    title: '[005] MENA compliance profile pack',
    body: 'Productized PDPL/DPL rules + workspace toggle\n\nFR-067, Sprint 19',
    labels: ['feature-005', 'sprint-19'],
  },
];

function parseRepoArg(): string | undefined {
  const idx = process.argv.indexOf('--repo');
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
  return process.env.GITHUB_REPOSITORY;
}

async function main() {
  const repo = parseRepoArg();
  const results: string[] = ['# GitHub Issues Backlog — Feature 005', '', `**Updated:** ${new Date().toISOString().slice(0, 10)}`, ''];

  if (!repo) {
    console.warn('[speckit:issues-005] No --repo or GITHUB_REPOSITORY — writing backlog only');
    for (const issue of ISSUES) {
      results.push(`| ${issue.id} | SKIPPED | ${issue.title} |`);
    }
    writeFileSync(backlogPath, results.join('\n'));
    return;
  }

  results.push('| Task ID | Issue | Title |');
  results.push('|---------|-------|-------|');

  for (const issue of ISSUES) {
    try {
      const labelArgs = issue.labels.flatMap((l) => ['--label', l]).join(' ');
      const cmd = `gh issue create --repo ${repo} --title "${issue.title.replace(/"/g, '\\"')}" --body "${issue.body.replace(/"/g, '\\"')}" ${labelArgs}`;
      const url = execSync(cmd, { encoding: 'utf8' }).trim();
      const num = url.match(/\/issues\/(\d+)/)?.[1] ?? 'created';
      results.push(`| ${issue.id} | #${num} | ${issue.title} |`);
      console.log(`Created ${issue.id} → ${url}`);
    } catch (err) {
      results.push(`| ${issue.id} | FAILED | ${issue.title} |`);
      console.error(`Failed ${issue.id}:`, err);
    }
  }

  writeFileSync(backlogPath, results.join('\n'));
  console.log('[speckit:issues-005] Updated issues-backlog.md');
}

main();
