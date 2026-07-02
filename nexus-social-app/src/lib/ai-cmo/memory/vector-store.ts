/**
 * L5 — VectorStore abstraction (Qdrant production backend).
 */

import {
  buildQdrantCollectionName,
  searchVectors,
  upsertVectors,
  type QdrantPoint,
} from '@/lib/ai-cmo/memory/qdrant-client';
import { generateEmbedding } from '@/lib/ai-cmo/memory/embedding-service';

export type VectorSearchResult = {
  id: string;
  score: number;
  payload: Record<string, unknown>;
};

export interface VectorStore {
  upsert(collectionSuffix: string, points: QdrantPoint[]): Promise<void>;
  search(
    collectionSuffix: string,
    queryText: string,
    limit: number,
  ): Promise<VectorSearchResult[]>;
}

export class QdrantVectorStore implements VectorStore {
  constructor(private readonly workspaceId: string) {}

  private collection(suffix: string): string {
    return buildQdrantCollectionName(this.workspaceId, suffix);
  }

  async upsert(collectionSuffix: string, points: QdrantPoint[]): Promise<void> {
    await upsertVectors(this.collection(collectionSuffix), points);
  }

  async search(
    collectionSuffix: string,
    queryText: string,
    limit: number,
  ): Promise<VectorSearchResult[]> {
    const vector = await generateEmbedding(queryText);
    return searchVectors(this.collection(collectionSuffix), vector, limit);
  }
}

export function createVectorStore(workspaceId: string): VectorStore {
  return new QdrantVectorStore(workspaceId);
}
