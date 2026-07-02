/**
 * Feature 004 Phase 8 — PII scrubbing for reconciler writes (Issue #18, GDPR/UAE PDPL).
 *
 * [SPEC]
 * - Recursively traverse JSON objects and arrays before SoR insert/patch
 * - Redact emails (require valid TLD — avoids @mentions and brand@voice handles)
 * - Redact phone numbers and credit card patterns
 * - Replace matches with [PII_REDACTED]
 * - Applied automatically in secureSyncToSoR / securePatchSoR for memory tables
 */

import { SorTableNames, type SorTableName } from '@/lib/sync/reconciler';

export const PII_REDACTED = '[PII_REDACTED]';

/** Requires domain + TLD so `brand@voice` and `@username` are not falsely scrubbed. */
export const EMAIL_PATTERN =
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

export const PHONE_PATTERN =
  /\b(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{3,4}(?:[-.\s]?\d{2,4})?\b/g;

export const CREDIT_CARD_PATTERN =
  /\b(?:\d[ -]*?){13,16}\b/g;

export type PiiScrubberOptions = {
  /** Object keys whose subtree is never scrubbed (e.g. brand_name, slug). */
  ignoreKeys?: string[];
  redactionToken?: string;
};

const DEFAULT_IGNORE_KEYS = new Set([
  'brand_name',
  'brandName',
  'brand_slug',
  'slug',
  'brand_id',
  'brandId',
  'workspace_id',
  'workspaceId',
  'campaign_id',
  'campaignId',
  'id',
  'uuid',
]);

/** Tables and JSONB columns scrubbed before reconciler persistence. */
export const PII_SCRUB_TABLE_COLUMNS: Partial<Record<SorTableName, readonly string[]>> = {
  [SorTableNames.AI_CMO_LEARNINGS]: ['context', 'action', 'outcome'],
  [SorTableNames.AI_CMO_AGENT_DECISIONS]: ['input_summary', 'output'],
  [SorTableNames.AI_CMO_STRATEGY_HISTORY]: ['previous_state', 'new_state'],
};

function scrubString(text: string, token: string): string {
  return text
    .replace(EMAIL_PATTERN, token)
    .replace(CREDIT_CARD_PATTERN, token)
    .replace(PHONE_PATTERN, token);
}

function shouldIgnoreKey(key: string, ignoreKeys: Set<string>): boolean {
  return ignoreKeys.has(key);
}

export function scrubPii(jsonPayload: unknown, options?: PiiScrubberOptions): unknown {
  const token = options?.redactionToken ?? PII_REDACTED;
  const ignoreKeys = new Set([...DEFAULT_IGNORE_KEYS, ...(options?.ignoreKeys ?? [])]);

  function walk(value: unknown, parentKey?: string): unknown {
    if (value == null) {
      return value;
    }

    if (typeof value === 'string') {
      if (parentKey && shouldIgnoreKey(parentKey, ignoreKeys)) {
        return value;
      }
      return scrubString(value, token);
    }

    if (Array.isArray(value)) {
      return value.map((item) => walk(item, parentKey));
    }

    if (typeof value === 'object') {
      const out: Record<string, unknown> = {};
      for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
        if (shouldIgnoreKey(key, ignoreKeys)) {
          out[key] = nested;
        } else {
          out[key] = walk(nested, key);
        }
      }
      return out;
    }

    return value;
  }

  return walk(jsonPayload);
}

export function scrubPiiForTableWrite(
  table: SorTableName,
  payload: Record<string, unknown>,
  options?: PiiScrubberOptions,
): Record<string, unknown> {
  const columns = PII_SCRUB_TABLE_COLUMNS[table];
  if (!columns?.length) {
    return payload;
  }

  const scrubbed = { ...payload };
  for (const column of columns) {
    if (column in scrubbed && scrubbed[column] != null) {
      scrubbed[column] = scrubPii(scrubbed[column], options);
    }
  }

  return scrubbed;
}

export function containsUnscrubbedPii(text: string): boolean {
  EMAIL_PATTERN.lastIndex = 0;
  PHONE_PATTERN.lastIndex = 0;
  CREDIT_CARD_PATTERN.lastIndex = 0;
  return (
    EMAIL_PATTERN.test(text) || PHONE_PATTERN.test(text) || CREDIT_CARD_PATTERN.test(text)
  );
}

export const piiScrubberUtils = {
  scrubPii,
  scrubPiiForTableWrite,
  containsUnscrubbedPii,
  PII_SCRUB_TABLE_COLUMNS,
};
