// INSTALL: @qdrant/js-client-rest (already in package.json)
/**
 * L5 — Production Qdrant vector client (hybrid memory + knowledge hub).
 */

import { QdrantClient } from '@qdrant/js-client-rest';
import type { MemoryQueryParams, MemoryResult } from '@/lib/ai-cmo/memory/types';
import { generateEmbedding } from '@/lib/ai-cmo/memory/embedding-service';

export type QdrantPoint = {
  id: string;
  vector: number[];
  payload: Record<string, unknown>;
};

export type QdrantSearchHit = {
  id: string;
  score: number;
  payload: Record<string, unknown>;
};

let cachedClient: QdrantClient | null = null;

export function getProductionQdrantClient(): QdrantClient | null {
  const url = process.env.QDRANT_URL;
  if (!url) return null;

  if (!cachedClient) {
    cachedClient = new QdrantClient({
      url,
      apiKey: process.env.QDRANT_API_KEY,
    });
  }

  return cachedClient;
}

export function buildQdrantCollectionName(workspaceId: string, suffix = 'learnings'): string {
  return `ws_${workspaceId.replace(/-/g, '_')}_${suffix}`;
}

export async function ensureCollection(
  client: QdrantClient,
  collection: string,
  vectorSize: number,
): Promise<void> {
  const collections = await client.getCollections();
  const exists = collections.collections.some((c) => c.name === collection);
  if (exists) return;

  await client.createCollection(collection, {
    vectors: { size: vectorSize, distance: 'Cosine' },
  });
}

export async function upsertVectors(
  collection: string,
  points: QdrantPoint[],
): Promise<void> {
  const client = getProductionQdrantClient();
  if (!client || points.length === 0) return;

  const vectorSize = points[0].vector.length;
  await ensureCollection(client, collection, vectorSize);

  await client.upsert(collection, {
    wait: true,
    points: points.map((p) => ({
      id: p.id,
      vector: p.vector,
      payload: p.payload,
    })),
  });
}

export async function searchVectors(
  collection: string,
  vector: number[],
  limit: number,
): Promise<QdrantSearchHit[]> {
  const client = getProductionQdrantClient();
  if (!client) return [];

  try {
    const hits = await client.search(collection, {
      vector,
      limit,
      with_payload: true,
    });

    return hits.map((hit) => ({
      id: String(hit.id),
      score: hit.score,
      payload: (hit.payload ?? {}) as Record<string, unknown>,
    }));
  } catch (err) {
    console.warn('[qdrant] search failed:', (err as Error).message);
    return [];
  }
}

function mapQdrantHitToMemoryResult(hit: QdrantSearchHit): MemoryResult {
  const payload = hit.payload;
  return {
    id: hit.id,
    learningType: String(payload.learning_type ?? payload.learningType ?? 'content_pattern'),
    context: (payload.context as Record<string, unknown>) ?? {},
    action: (payload.action as Record<string, unknown>) ?? {},
    outcome: (payload.outcome as Record<string, unknown>) ?? {},
    roiImpact: payload.roi_impact != null ? Number(payload.roi_impact) : null,
    confidence: payload.confidence != null ? Number(payload.confidence) : null,
    validatedByHuman: Boolean(payload.validated_by_human ?? payload.validatedByHuman),
    createdAt: String(payload.created_at ?? payload.createdAt ?? new Date().toISOString()),
    source: 'qdrant',
    relevanceScore: hit.score,
  };
}

export async function searchQdrantLearnings(input: MemoryQueryParams): Promise<MemoryResult[]> {
  if (!input.objective?.trim()) return [];

  const collection = buildQdrantCollectionName(input.workspaceId, 'learnings');
  const limit = input.k ?? 10;
  const vector = await generateEmbedding(input.objective);
  const hits = await searchVectors(collection, vector, limit);

  return hits.map(mapQdrantHitToMemoryResult);
}

export function resetQdrantClientForTests(): void {
  cachedClient = null;
}

export const qdrantClientUtils = {
  getProductionQdrantClient,
  upsertVectors,
  searchVectors,
  searchQdrantLearnings,
  buildQdrantCollectionName,
};
