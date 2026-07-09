import { describe, expect, it } from 'vitest';
import {
  buildAuditedThread,
  conversationMetadataFromAbmSeed,
  crmMirrorMetadataForThread,
} from '@/lib/ai-cmo/conversation/audited-thread';
import {
  buildMarginGateReport,
} from '@/lib/ai-cmo/finops/margin-gate-report';
import { MARGIN_GATE_THRESHOLD } from '@/lib/ai-cmo/finops/cost-to-serve';
import { COMPLIANCE_PROFILE_CATALOG } from '@/lib/governance/compliance-profiles/mena-v1';
import { validateWrite, SorTableNames } from '@/lib/sync/reconciler';

describe('Feature 006 Phase 3 — audited thread', () => {
  it('builds metadata and chain from ABM seed', () => {
    const seed = {
      abmPlaybookRunId: 'run-1',
      accountIntentId: 'intent-1',
      accountDomain: 'acme.io',
      campaignJobId: 'job-1',
      accountName: 'Acme',
    };
    const meta = conversationMetadataFromAbmSeed(seed);
    expect(meta.auditedThread).toBe(true);
    expect(meta.accountDomain).toBe('acme.io');

    const thread = buildAuditedThread({
      ...seed,
      qualificationId: 'qual-1',
      qualifiedLeadId: 'lead-1',
    });
    expect(thread.joinKey).toBe('acme.io');
    expect(thread.chain[0]).toContain('run-1');
    expect(crmMirrorMetadataForThread({ accountDomain: 'acme.io' }).source).toBe(
      'feature_006_audited_thread',
    );
  });
});

describe('Feature 006 Phase 3 — margin gate report', () => {
  it('PASS when margin >= 55%', () => {
    const report = buildMarginGateReport({
      workspaceId: '11111111-1111-1111-1111-111111111111',
      periodMonth: '2026-07-01',
      costs: {
        mrrUsd: 10000,
        llmApiUsd: 500,
        whatsappMessageUsd: 200,
        bspFeeUsd: 100,
        pitCrewLaborUsd: 2000,
        infraAllocUsd: 500,
      },
    });
    expect(report.decision).toBe('PASS');
    expect(report.stopScale).toBe(false);
    expect(report.passesMarginGate).toBe(true);
    expect(report.gateThreshold).toBe(MARGIN_GATE_THRESHOLD);
  });

  it('FAIL stop-scale when margin < 55%', () => {
    const report = buildMarginGateReport({
      workspaceId: '11111111-1111-1111-1111-111111111111',
      periodMonth: '2026-07-01',
      costs: {
        mrrUsd: 10000,
        llmApiUsd: 3000,
        whatsappMessageUsd: 1000,
        bspFeeUsd: 500,
        pitCrewLaborUsd: 3000,
        infraAllocUsd: 1000,
      },
    });
    expect(report.decision).toBe('FAIL');
    expect(report.stopScale).toBe(true);
  });

  it('validates cost_to_serve_snapshots schema', () => {
    const v = validateWrite(SorTableNames.COST_TO_SERVE_SNAPSHOTS, {
      workspace_id: '11111111-1111-1111-1111-111111111111',
      period_month: '2026-07-01',
      mrr_usd: 10000,
      stop_scale: false,
      passes_margin_gate: true,
    });
    expect(v.ok).toBe(true);
  });
});

describe('Feature 006 T022 — compliance catalog smoke', () => {
  it('lists mena_conversational_v1 in COMPLIANCE_PROFILE_CATALOG', () => {
    expect(COMPLIANCE_PROFILE_CATALOG.mena_conversational_v1.id).toBe(
      'mena_conversational_v1',
    );
    expect(COMPLIANCE_PROFILE_CATALOG.mena_conversational_v1.arabicRegister).toBe(
      'dialect_allowed',
    );
    expect(Object.keys(COMPLIANCE_PROFILE_CATALOG)).toContain('mena_conversational_v1');
  });
});
