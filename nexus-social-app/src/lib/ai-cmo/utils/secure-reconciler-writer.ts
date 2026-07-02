/**

 * Feature 004 — rate-limited wrapper around 003 reconciler writes for `ai_cmo_*` tables.

 * 003 reconciler (`src/lib/sync/reconciler.ts`) is never modified; this module delegates to it.

 *

 * Phase 5: securePatchSoR supports optimistic concurrency control (OCC) via expectedVersion.

 */



import redis from '@/lib/cache';

import { scrubPiiForTableWrite } from '@/lib/governance/pii-scrubber';
import { indexLearningToQdrant } from '@/lib/ai-cmo/memory/learning-indexer';

import {

  patchSoR,

  syncToSoR,

  SorTableNames,

  type PatchSoRInput,

  type SorTableName,

  type SyncToSoRInput,

  type SyncToSoRResult,

} from '@/lib/sync/reconciler';

import { supabaseAdmin } from '@/lib/supabase/server';

import {

  AI_CMO_RATE_LIMIT,

  buildAiCmoRateLimitKey,

  isAiCmoSorTable,

  OptimisticLockError,

  type AiCmoReconcilerWriteOptions,

  type UpsertOptions,

} from '@/lib/ai-cmo/types/reconciler';



export type { UpsertOptions };
export { OptimisticLockError };



export type RateLimitCheckResult =

  | { allowed: true; count: number }

  | { allowed: false; count: number; reason: string };



type OccRow = {

  version?: number | null;

  updated_at?: string | null;

};



async function loadRowForOcc(

  table: PatchSoRInput['table'],

  id: string,

  workspaceId: string,

  versionColumn: string,

): Promise<OccRow | null> {

  const { data, error } = await supabaseAdmin

    .from(table)

    .select(`${versionColumn}, updated_at`)

    .eq('id', id)

    .eq('workspace_id', workspaceId)

    .maybeSingle();



  if (error || !data) {

    return null;

  }



  return data as OccRow;

}



async function enforceOptimisticLock(

  input: PatchSoRInput,

  options?: UpsertOptions,

): Promise<void> {

  if (options?.expectedVersion == null && !options?.expectedUpdatedAt) {

    return;

  }



  const versionColumn = options?.versionColumn ?? 'version';

  const current = await loadRowForOcc(input.table, input.id, input.workspaceId, versionColumn);



  if (!current) {

    throw new OptimisticLockError({

      table: input.table,

      id: input.id,

      expectedVersion: options?.expectedVersion,

      actualVersion: undefined,

      expectedUpdatedAt: options?.expectedUpdatedAt,

      actualUpdatedAt: undefined,

    });

  }



  if (options?.expectedVersion != null) {

    const actualVersion = Number(current.version ?? 0);

    if (actualVersion !== options.expectedVersion) {

      throw new OptimisticLockError({

        table: input.table,

        id: input.id,

        expectedVersion: options.expectedVersion,

        actualVersion,

      });

    }

  }



  if (options?.expectedUpdatedAt) {

    const actualUpdatedAt = current.updated_at ?? undefined;

    if (actualUpdatedAt !== options.expectedUpdatedAt) {

      throw new OptimisticLockError({

        table: input.table,

        id: input.id,

        expectedUpdatedAt: options.expectedUpdatedAt,

        actualUpdatedAt,

      });

    }

  }

}



function applyVersionIncrement(

  patch: Record<string, unknown>,

  options?: UpsertOptions,

): Record<string, unknown> {

  if (options?.expectedVersion == null) {

    return patch;

  }



  const versionColumn = options.versionColumn ?? 'version';

  return {

    ...patch,

    [versionColumn]: options.expectedVersion + 1,

    updated_at: new Date().toISOString(),

  };

}



function applyPiiScrubbing(

  table: SorTableName,

  payload: Record<string, unknown>,

): Record<string, unknown> {

  return scrubPiiForTableWrite(table, payload);

}



export async function checkAndIncrementAiCmoWriteRate(

  workspaceId: string,

): Promise<RateLimitCheckResult> {

  if (!redis) {

    return {

      allowed: false,

      count: 0,

      reason: 'Redis unavailable — AI CMO writes blocked (fail-closed)',

    };

  }



  const key = buildAiCmoRateLimitKey(workspaceId);



  try {

    const count = await redis.incr(key);

    if (count === 1) {

      await redis.expire(key, AI_CMO_RATE_LIMIT.windowSeconds);

    }



    if (count > AI_CMO_RATE_LIMIT.maxWritesPerWindow) {

      return {

        allowed: false,

        count,

        reason: `AI CMO write rate limit exceeded (${AI_CMO_RATE_LIMIT.maxWritesPerWindow}/min)`,

      };

    }



    return { allowed: true, count };

  } catch (err) {

    const message = err instanceof Error ? err.message : 'Redis rate-limit error';

    return { allowed: false, count: 0, reason: message };

  }

}



async function enforceAiCmoRateLimit(

  table: SyncToSoRInput['table'],

  workspaceId: string,

  options?: Pick<AiCmoReconcilerWriteOptions, 'skipRateLimit'>,

): Promise<SyncToSoRResult | null> {

  if (!isAiCmoSorTable(table) || options?.skipRateLimit) {

    return null;

  }



  const check = await checkAndIncrementAiCmoWriteRate(workspaceId);

  if (!check.allowed) {

    return { ok: false, error: check.reason };

  }



  return null;

}



export async function secureSyncToSoR(

  input: SyncToSoRInput,

  options?: AiCmoReconcilerWriteOptions,

): Promise<SyncToSoRResult> {

  const workspaceId = options?.workspaceId ?? input.workspaceId;

  const rateBlock = await enforceAiCmoRateLimit(input.table, workspaceId, options);

  if (rateBlock) {

    return rateBlock;

  }



  const auditMetadata =

    options?.correlationId != null

      ? { ...input.auditMetadata, correlationId: options.correlationId }

      : input.auditMetadata;



  const scrubbedData = applyPiiScrubbing(input.table, input.data);

  const result = await syncToSoR({

    ...input,

    data: scrubbedData,

    auditMetadata,

  });

  if (
    result.ok &&
    input.table === SorTableNames.AI_CMO_LEARNINGS &&
    process.env.QDRANT_URL
  ) {
    void indexLearningToQdrant({
      workspaceId,
      learningId: result.id,
      learning: scrubbedData,
    }).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      console.warn('[learning-indexer] Qdrant upsert failed:', message);
    });
  }

  return result;

}



export async function securePatchSoR(

  input: PatchSoRInput,

  options?: UpsertOptions,

): Promise<SyncToSoRResult> {

  const workspaceId = options?.workspaceId ?? input.workspaceId;

  const rateBlock = await enforceAiCmoRateLimit(input.table, workspaceId, options);

  if (rateBlock) {

    return rateBlock;

  }



  try {

    await enforceOptimisticLock(input, options);

  } catch (error) {

    if (error instanceof OptimisticLockError) {

      return { ok: false, error: error.message };

    }

    throw error;

  }



  const patch = applyVersionIncrement(input.patch, options);



  const auditMetadata =

    options?.correlationId != null

      ? { ...input.auditMetadata, correlationId: options.correlationId, occ: true }

      : { ...input.auditMetadata, occ: Boolean(options?.expectedVersion ?? options?.expectedUpdatedAt) };



  return patchSoR({

    ...input,

    patch: applyPiiScrubbing(input.table, patch),

    auditMetadata,

  });

}



export const secureReconcilerWriterUtils = {

  checkAndIncrementAiCmoWriteRate,

  secureSyncToSoR,

  securePatchSoR,

  isAiCmoSorTable,

  enforceOptimisticLock,

};


