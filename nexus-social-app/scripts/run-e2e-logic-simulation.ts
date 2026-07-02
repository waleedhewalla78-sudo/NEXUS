/**
 * Feature 004 V1.0 — In-Memory E2E Logic Verification Suite
 *
 * Proves constitutional rules (PII scrub, policy tiers, Arabic quality gate)
 * without Postman, Redis, Postgres, or live LLMs.
 *
 * Usage:
 *   npx tsx scripts/run-e2e-logic-simulation.ts
 *   npm run e2e:logic-simulation
 */

import { runCampaignWorkflow } from '../src/lib/orchestration/workflows/campaign-workflow';
import type { CampaignWorkflowDeps } from '../src/lib/orchestration/workflows/campaign-workflow';
import {
  contentPieceFromPlanAndContent,
  policyEngineV2,
} from '../src/lib/governance/policy-engine-v2';
import {
  PII_REDACTED,
  scrubPiiForTableWrite,
  containsUnscrubbedPii,
  EMAIL_PATTERN,
  piiScrubberUtils,
} from '../src/lib/governance/pii-scrubber';
import {
  applyAutoRejectRules,
  qualityEvaluatorUtils,
} from '../src/lib/ai-cmo/quality/quality-evaluator';
import type { QualityEvaluationResult } from '../src/lib/ai-cmo/quality/types';
import type { EvaluationDimensions } from '../src/lib/ai-cmo/quality/types';
import type { CreatedContent } from '../src/lib/ai-cmo/creator-agent';
import type { StrategicPlan } from '../src/lib/ai-cmo/strategic-brain';
import { SorTableNames, type SyncToSoRInput } from '../src/lib/sync/reconciler';
import { OptimisticLockError } from '../src/lib/ai-cmo/types/reconciler';
import type { PolicyResult } from '../src/lib/governance/types/policy';

// ─── Fixtures ───────────────────────────────────────────────────────────────

const WORKSPACE_ID = 'ws-e2e-test';
const BRAND_ID = 'brand-arabic-fashion';
const USER_ID = 'user-e2e-simulation';
const POISON_EMAIL = 'promo@nexus.ae';

const POISON_OBJECTIVE = `Launch summer collection, contact ${POISON_EMAIL} for VIP access in Riyadh.`;

const POLICY_VIOLATION_OBJECTIVE =
  'Guaranteed 50% ROI on government healthcare contracts.';

const ARABIC_LOCALE = 'ar-SA';

// ─── Assertion helpers ────────────────────────────────────────────────────────

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`\n❌ FATAL: ${message}\n`);
    process.exit(1);
  }
}

function assertThrows(fn: () => void, expectedSubstring: string, message: string): void {
  try {
    fn();
    assert(false, `${message} (expected throw containing "${expectedSubstring}")`);
  } catch (err) {
    const text = err instanceof Error ? err.message : String(err);
    assert(
      text.includes(expectedSubstring),
      `${message} — got "${text}" instead of "${expectedSubstring}"`,
    );
  }
}

// ─── Mock: Reconciler (runs real PII scrubber) ───────────────────────────────

type RecordedSyncCall = {
  table: string;
  data: Record<string, unknown>;
  scrubbed: Record<string, unknown>;
};

class MockReconciler {
  readonly calls: RecordedSyncCall[] = [];
  private versionStore = new Map<string, number>();

  sync(input: SyncToSoRInput): { ok: true; id: string } {
    const scrubbed = scrubPiiForTableWrite(
      input.table,
      input.data as Record<string, unknown>,
    ) as Record<string, unknown>;

    this.calls.push({
      table: input.table,
      data: input.data as Record<string, unknown>,
      scrubbed,
    });

    // Production only scrubs configured JSONB columns (Issue #18 memory tables).
    const scrubColumns = piiScrubberUtils.PII_SCRUB_TABLE_COLUMNS[input.table];
    if (scrubColumns?.length) {
      const serialized = JSON.stringify(scrubbed);
      assert(
        !containsUnscrubbedPii(serialized),
        `Constitutional violation: unscrubbed PII reached mock SoR for table ${input.table}`,
      );
    }

    return { ok: true, id: `mock-${this.calls.length}` };
  }

  patchWithOcc(
    table: string,
    id: string,
    patch: Record<string, unknown>,
    expectedVersion: number,
  ): { ok: true } | { ok: false; error: string } {
    const key = `${table}:${id}`;
    const current = this.versionStore.get(key) ?? 0;
    if (current !== expectedVersion) {
      return {
        ok: false,
        error: new OptimisticLockError({
          table,
          id,
          expectedVersion,
          actualVersion: current,
        }).message,
      };
    }
    this.versionStore.set(key, current + 1);
    this.sync({
      table: table as SyncToSoRInput['table'],
      workspaceId: WORKSPACE_ID,
      userId: USER_ID,
      auditAction: 'e2e.simulation.patch',
      data: patch,
    });
    return { ok: true };
  }

  seedVersion(table: string, id: string, version: number): void {
    this.versionStore.set(`${table}:${id}`, version);
  }
}

// ─── Mock: Redis (rate limit + circuit state) ────────────────────────────────

class MockRedis {
  private store = new Map<string, string>();

  incr(key: string): number {
    const current = Number(this.store.get(key) ?? '0') + 1;
    this.store.set(key, String(current));
    return current;
  }

  get(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  set(key: string, value: string): void {
    this.store.set(key, value);
  }
}

// ─── Mock: ProviderRouter responses ─────────────────────────────────────────

type JudgeMode = 'pass' | 'arabic_fail';

function buildEvaluationFromDimensions(
  dimensions: EvaluationDimensions,
  locale: string,
  mode: JudgeMode,
): QualityEvaluationResult {
  const overallScore = qualityEvaluatorUtils.computeOverallScore(dimensions);
  const hallucinationFlag = dimensions.safety < 0.5;
  const { autoRejected, rejectionReasons } = applyAutoRejectRules({
    dimensions,
    overallScore,
    hallucinationFlag,
    locale,
  });

  const requiresRevision =
    autoRejected &&
    rejectionReasons[0] !== undefined &&
    rejectionReasons[0] !== 'HALLUCINATION';

  const shouldPublish = !autoRejected && overallScore >= 0.85;

  return {
    dimensions,
    overallScore,
    hallucinationFlag,
    autoRejected,
    rejectionReasons,
    requiresRevision,
    revisionFeedback: requiresRevision
      ? `Improve: ${rejectionReasons.join(', ')}`
      : undefined,
    shouldPublish,
    evaluatorModel: mode === 'arabic_fail' ? 'mock/judge-arabic-fail' : 'mock/judge-pass',
    rawJudgeResponse: JSON.stringify(dimensions),
  };
}

function passingDimensions(): EvaluationDimensions {
  return {
    accuracy: 0.92,
    brandAlignment: 0.9,
    localization: 0.88,
    uniqueness: 0.85,
    eeat: 0.9,
    engagement: 0.88,
    platformCompliance: 0.95,
    safety: 0.96,
  };
}

function arabicFailDimensions(): EvaluationDimensions {
  return {
    ...passingDimensions(),
    localization: 0.6,
  };
}

// ─── Workflow helpers ─────────────────────────────────────────────────────────

function basePlan(objective: string): StrategicPlan {
  return {
    objective,
    audience: 'Fashion ICP',
    channels: ['instagram', 'linkedin'],
    keyMessages: [objective],
    contentThemes: ['summer'],
    kpis: ['engagement_rate'],
    horizon: 'tactical',
    rawSummary: objective.slice(0, 120),
  };
}

function baseContent(
  caption: string,
  locale: string,
  extra?: Partial<CreatedContent>,
): CreatedContent {
  return {
    caption,
    hashtags: ['#fashion'],
    callToAction: 'Shop now',
    platforms: ['instagram'],
    locale,
    draftMetadata: {},
    ...extra,
  };
}

function buildWorkflowDeps(options: {
  plan: StrategicPlan;
  content: CreatedContent;
  locale: string;
  industry?: string;
  judgeMode: JudgeMode;
  reconciler: MockReconciler;
  onApproval: Array<{ reason: string; riskTier?: string }>;
  poisonEmailInLearning?: boolean;
}): CampaignWorkflowDeps {
  const wrapper = () => ({
    plan: options.plan,
    content: options.content,
    quality: { overallScore: 0.9 },
    confidence: 0.9,
  });

  return {
    finopsPreflight: async () => ({
      allowed: true,
      spendUsd: 10,
      capUsd: 100,
    }),

    planCampaign: async () => wrapper(),

    retrieveMemory: async () => [],

    generateContent: async () => wrapper(),

    checkContentUniqueness: async () => ({
      isUnique: true,
      similarityScore: 0.2,
      source: 'none' as const,
      checkedAgainst: 0,
    }),

    reviseContent: async (content) => content,

    structuredPolicyReview: async (contentWrapper) => {
      const w = contentWrapper as ReturnType<typeof wrapper>;
      const piece = contentPieceFromPlanAndContent({
        plan: w.plan,
        content: w.content,
        locale: options.locale,
        industry: options.industry ?? (w.content.draftMetadata.industry as string | undefined),
        qualityScore: 0.9,
      });
      return policyEngineV2.evaluate(piece);
    },

    runQualityEvaluation: async (contentWrapper) => {
      const w = contentWrapper as ReturnType<typeof wrapper>;
      const dimensions =
        options.judgeMode === 'arabic_fail'
          ? arabicFailDimensions()
          : passingDimensions();
      return buildEvaluationFromDimensions(dimensions, w.content.locale, options.judgeMode);
    },

    persistQualityEvaluation: async () => ({
      evaluationId: 'eval-mock-1',
      contentId: 'content-mock-1',
    }),

    syncToSoR: async () => {
      if (options.poisonEmailInLearning) {
        options.reconciler.sync({
          table: SorTableNames.AI_CMO_LEARNINGS,
          workspaceId: WORKSPACE_ID,
          userId: USER_ID,
          auditAction: 'e2e.simulation.learning',
          data: {
            learning_type: 'content_pattern',
            context: {
              contact: POISON_EMAIL,
              note: `VIP list includes ${POISON_EMAIL} for Riyadh launch`,
            },
            action: { recommendation: 'Use email nurture sequence' },
            outcome: {},
          },
        });
      }
      options.reconciler.sync({
        table: SorTableNames.AI_CMO_CAMPAIGNS,
        workspaceId: WORKSPACE_ID,
        userId: USER_ID,
        auditAction: 'e2e.simulation.campaign',
        data: {
          name: options.plan.objective.slice(0, 80),
          status: 'active',
          brand_id: BRAND_ID,
        },
      });
    },

    routeToApproval: async (_content, reason, riskTier) => {
      options.onApproval.push({ reason, riskTier });
    },
  };
}

// ─── Scenario runners ─────────────────────────────────────────────────────────

type ScenarioResult = {
  name: string;
  trigger: string;
  rule: string;
  outcome: string;
  status: 'PASS' | 'FAIL';
};

const report: ScenarioResult[] = [];

async function scenarioA_closedLoopHappyPath(): Promise<void> {
  const name = 'A: Closed Loop (Happy Path + PII)';
  const reconciler = new MockReconciler();
  const approvals: Array<{ reason: string; riskTier?: string }> = [];

  const plan = basePlan(POISON_OBJECTIVE);
  const content = baseContent(
    `Summer styles are here. VIP buyers reach us at ${POISON_EMAIL}.`,
    'en-US',
  );

  const deps = buildWorkflowDeps({
    plan,
    content,
    locale: 'en-US',
    judgeMode: 'pass',
    reconciler,
    onApproval: approvals,
    poisonEmailInLearning: true,
  });

  const result = await runCampaignWorkflow(
    { campaignId: 'camp-e2e-a', workspaceId: WORKSPACE_ID, objective: POISON_OBJECTIVE },
    deps,
  );

  assert(result.status === 'published', `${name}: expected published, got ${result.status}`);

  const learningCall = reconciler.calls.find((c) => c.table === SorTableNames.AI_CMO_LEARNINGS);
  assert(Boolean(learningCall), `${name}: expected learning write via mock reconciler`);

  const context = learningCall!.scrubbed.context as Record<string, unknown>;
  const contextJson = JSON.stringify(context);
  assert(
    contextJson.includes(PII_REDACTED),
    `${name}: context must contain ${PII_REDACTED}`,
  );
  assert(
    !contextJson.includes(POISON_EMAIL),
    `${name}: raw email ${POISON_EMAIL} must not appear in scrubbed context`,
  );
  assert(approvals.length === 0, `${name}: must not route to approval on happy path`);

  report.push({
    name,
    trigger: `Objective contains ${POISON_EMAIL}`,
    rule: 'PII scrubber redacts emails before SoR (Issue #18)',
    outcome: `published; context scrubbed → ${PII_REDACTED}`,
    status: 'PASS',
  });
}

async function scenarioB_policyBlock(): Promise<void> {
  const name = 'B: Constitution Shield (Policy CRITICAL)';
  const reconciler = new MockReconciler();
  const approvals: Array<{ reason: string; riskTier?: string }> = [];

  const plan = basePlan(POLICY_VIOLATION_OBJECTIVE);
  const content = baseContent(POLICY_VIOLATION_OBJECTIVE, 'en-US', {
    draftMetadata: { industry: 'healthcare' },
  });

  const deps = buildWorkflowDeps({
    plan,
    content,
    locale: 'en-US',
    industry: 'healthcare',
    judgeMode: 'pass',
    reconciler,
    onApproval: approvals,
  });

  const policyPiece = contentPieceFromPlanAndContent({
    plan,
    content,
    locale: 'en-US',
    industry: 'healthcare',
  });
  const policyOnly: PolicyResult = policyEngineV2.evaluate(policyPiece);
  assert(
    policyOnly.riskTier === 'CRITICAL',
    `${name}: pre-check riskTier must be CRITICAL, got ${policyOnly.riskTier}`,
  );

  const result = await runCampaignWorkflow(
    {
      campaignId: 'camp-e2e-b',
      workspaceId: WORKSPACE_ID,
      objective: POLICY_VIOLATION_OBJECTIVE,
    },
    deps,
  );

  assert(
    result.status === 'policy_blocked' || result.status === 'approval_required',
    `${name}: expected policy block, got ${result.status}`,
  );
  assert(approvals.length >= 1, `${name}: must route to approval queue`);
  assert(
    reconciler.calls.length === 0,
    `${name}: must not persist to SoR on CRITICAL policy (got ${reconciler.calls.length} calls)`,
  );

  report.push({
    name,
    trigger: 'Government + healthcare + guaranteed ROI language',
    rule: 'Policy Engine V2 CRITICAL tier blocks auto-publish',
    outcome: `${result.status}; approval routed (${policyOnly.riskTier})`,
    status: 'PASS',
  });
}

async function scenarioC_arabicQualityGate(): Promise<void> {
  const name = 'C: Quality Gate (Arabic ar-SA localization)';
  const reconciler = new MockReconciler();
  const approvals: Array<{ reason: string; riskTier?: string }> = [];

  const plan = basePlan('Launch Ramadan modest fashion capsule in Riyadh');
  const content = baseContent('تشكيلة الأزياء المحتشمة للرمضان', ARABIC_LOCALE);

  const deps = buildWorkflowDeps({
    plan,
    content,
    locale: ARABIC_LOCALE,
    judgeMode: 'arabic_fail',
    reconciler,
    onApproval: approvals,
  });

  const evalResult = buildEvaluationFromDimensions(
    arabicFailDimensions(),
    ARABIC_LOCALE,
    'arabic_fail',
  );
  assert(evalResult.autoRejected === true, `${name}: autoRejected must be true`);
  assert(
    evalResult.rejectionReasons.includes('LOCALIZATION_TOO_LOW'),
    `${name}: rejection must include LOCALIZATION_TOO_LOW`,
  );

  const result = await runCampaignWorkflow(
    {
      campaignId: 'camp-e2e-c',
      workspaceId: WORKSPACE_ID,
      objective: plan.objective,
    },
    deps,
  );

  assert(result.status === 'rejected', `${name}: expected rejected, got ${result.status}`);
  assert(
    (result.reason ?? '').includes('LOCALIZATION_TOO_LOW'),
    `${name}: reason must include LOCALIZATION_TOO_LOW, got "${result.reason}"`,
  );

  report.push({
    name,
    trigger: `locale=${ARABIC_LOCALE}, judge localization=0.6`,
    rule: 'Doc 07: ar-* localization < 0.75 → LOCALIZATION_TOO_LOW auto-reject',
    outcome: `rejected: ${result.reason}`,
    status: 'PASS',
  });
}

async function scenarioD_optimisticLock(): Promise<void> {
  const name = 'D: Optimistic Lock (OCC)';
  const reconciler = new MockReconciler();
  reconciler.seedVersion('ai_cmo_campaigns', 'camp-occ-1', 2);

  const patchResult = reconciler.patchWithOcc(
    'ai_cmo_campaigns',
    'camp-occ-1',
    { status: 'paused' },
    1,
  );
  assert(patchResult.ok === false, `${name}: stale version must fail patch`);

  assertThrows(
    () => {
      throw new OptimisticLockError({
        table: 'ai_cmo_campaigns',
        id: 'camp-occ-1',
        expectedVersion: 1,
        actualVersion: 2,
      });
    },
    'Optimistic lock conflict',
    `${name}: OptimisticLockError shape`,
  );

  report.push({
    name,
    trigger: 'expectedVersion=1, actualVersion=2',
    rule: 'OptimisticLockError on version mismatch (Phase 5 OCC)',
    outcome: 'patch rejected; conflict detected',
    status: 'PASS',
  });
}

// ─── Mock Redis smoke (rate limit key) ────────────────────────────────────────

function verifyMockRedisRateLimit(): void {
  const redis = new MockRedis();
  const key = `workspace:${WORKSPACE_ID}:ai_cmo_rate`;
  for (let i = 0; i < 3; i += 1) redis.incr(key);
  assert(Number(redis.get(key)) === 3, 'MockRedis incr/get must track rate limit key');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function printReportTable(): void {
  console.log('\n╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║           Feature 004 — E2E Logic Verification Results                      ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');

  const col = (s: string, w: number) => s.slice(0, w).padEnd(w);
  console.log(
    `${col('Scenario', 36)} | ${col('Input Trigger', 28)} | ${col('Constitutional Rule', 32)} | ${col('Outcome', 24)} | Status`,
  );
  console.log('-'.repeat(140));

  for (const row of report) {
    console.log(
      `${col(row.name, 36)} | ${col(row.trigger, 28)} | ${col(row.rule, 32)} | ${col(row.outcome, 24)} | ${row.status}`,
    );
  }

  const allPass = report.every((r) => r.status === 'PASS');
  console.log('\n' + (allPass ? '✅ ALL SCENARIOS PASSED' : '❌ FAILURES DETECTED'));
}

async function main(): Promise<void> {
  console.log('Feature 004 V1.0 — In-Memory Logic Verification Suite');
  console.log('─'.repeat(56));
  console.log(`PII email pattern : ${EMAIL_PATTERN.source}`);
  console.log(`Arabic threshold  : ar-* localization < 0.75 → LOCALIZATION_TOO_LOW`);
  console.log(`Workspace         : ${WORKSPACE_ID}`);
  console.log(`Brand             : ${BRAND_ID}\n`);

  verifyMockRedisRateLimit();

  await scenarioA_closedLoopHappyPath();
  await scenarioB_policyBlock();
  await scenarioC_arabicQualityGate();
  await scenarioD_optimisticLock();

  printReportTable();
}

main().catch((err) => {
  console.error('Unhandled fatal error:', err);
  process.exit(1);
});
