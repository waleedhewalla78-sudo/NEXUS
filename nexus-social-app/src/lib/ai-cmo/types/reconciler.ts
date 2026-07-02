/**
 * Feature 004 — reconciler write contracts (extends 003 SoR pattern via secure wrapper).
 */

import type {
  PatchSoRInput,
  SorTableName,
  SyncToSoRInput,
  SyncToSoRResult,
} from '@/lib/sync/reconciler';

export type { PatchSoRInput, SorTableName, SyncToSoRInput, SyncToSoRResult };

export { SorTableNames } from '@/lib/sync/reconciler';

/** Options applied by the 004 secure reconciler writer before delegating to 003 reconciler. */
export interface AiCmoReconcilerWriteOptions {
  /** Workspace scope — required for rate-limit key `workspace:{id}:ai_cmo_rate`. */
  workspaceId: string;
  /** When true, skip Redis rate-limit check (internal reconciliation jobs only). */
  skipRateLimit?: boolean;
  /** Optional correlation id for audit metadata. */
  correlationId?: string;
}

/** Optimistic concurrency options for securePatchSoR (Phase 5). */
export interface UpsertOptions extends AiCmoReconcilerWriteOptions {
  /** Expected row version — patch fails with OptimisticLockError if mismatch. */
  expectedVersion?: number;
  /** Expected updated_at ISO timestamp — alternative OCC check. */
  expectedUpdatedAt?: string;
  /** Column used for version-based OCC (default: version). */
  versionColumn?: string;
}

export class OptimisticLockError extends Error {
  readonly code = 'OPTIMISTIC_LOCK_CONFLICT';
  readonly table: string;
  readonly id: string;
  readonly expectedVersion?: number;
  readonly actualVersion?: number;
  readonly expectedUpdatedAt?: string;
  readonly actualUpdatedAt?: string;

  constructor(params: {
    table: string;
    id: string;
    expectedVersion?: number;
    actualVersion?: number;
    expectedUpdatedAt?: string;
    actualUpdatedAt?: string;
  }) {
    const detail =
      params.expectedVersion != null
        ? `expected version ${params.expectedVersion}, found ${params.actualVersion ?? 'unknown'}`
        : `expected updated_at ${params.expectedUpdatedAt}, found ${params.actualUpdatedAt ?? 'unknown'}`;
    super(`Optimistic lock conflict on ${params.table}/${params.id}: ${detail}`);
    this.name = 'OptimisticLockError';
    this.table = params.table;
    this.id = params.id;
    this.expectedVersion = params.expectedVersion;
    this.actualVersion = params.actualVersion;
    this.expectedUpdatedAt = params.expectedUpdatedAt;
    this.actualUpdatedAt = params.actualUpdatedAt;
  }
}

export const AI_CMO_RATE_LIMIT = {
  maxWritesPerWindow: 100,
  windowSeconds: 60,
  redisKeyPrefix: 'workspace:',
  redisKeySuffix: ':ai_cmo_rate',
} as const;

export function isAiCmoSorTable(table: SorTableName): boolean {
  return table.startsWith('ai_cmo_');
}

export function buildAiCmoRateLimitKey(workspaceId: string): string {
  return `${AI_CMO_RATE_LIMIT.redisKeyPrefix}${workspaceId}${AI_CMO_RATE_LIMIT.redisKeySuffix}`;
}
