/**
 * Feature 004 Sprint 16 — Redis stream consistent-hash sharding.
 */

export const MARKETING_EVENTS_STREAM_BASE =
  process.env.MARKETING_EVENTS_STREAM_KEY ?? 'marketing:events';

export const MARKETING_EVENTS_TOTAL_SHARDS = Number(
  process.env.MARKETING_EVENTS_TOTAL_SHARDS ?? '4',
);

function hashWorkspaceId(workspaceId: string): number {
  let hash = 0;
  for (let i = 0; i < workspaceId.length; i += 1) {
    hash = (hash * 31 + workspaceId.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function resolveMarketingStreamShard(workspaceId: string): number {
  return hashWorkspaceId(workspaceId) % MARKETING_EVENTS_TOTAL_SHARDS;
}

export function marketingStreamKeyForWorkspace(workspaceId: string): string {
  const shard = resolveMarketingStreamShard(workspaceId);
  return `${MARKETING_EVENTS_STREAM_BASE}:${shard}`;
}

export function allMarketingStreamShardKeys(): string[] {
  return Array.from({ length: MARKETING_EVENTS_TOTAL_SHARDS }, (_, shard) =>
    `${MARKETING_EVENTS_STREAM_BASE}:${shard}`,
  );
}
