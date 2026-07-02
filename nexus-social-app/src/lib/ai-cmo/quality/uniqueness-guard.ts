/**
 * Feature 004 Phase 6 — SEO cannibalization guard (Doc 07, Dimension 4).
 *
 * [SPEC]
 * - Compare new content against last 50 workspace posts before LLM-as-Judge
 * - Cosine similarity > 0.70 → CannibalizationWarning (auto-reject path)
 * - Qdrant vector search when client available; PG content_pieces fallback
 */

import { supabaseAdmin } from '@/lib/supabase/server';
import { buildQdrantCollectionName, searchVectors } from '@/lib/ai-cmo/memory/qdrant-client';
import { generateEmbedding } from '@/lib/ai-cmo/memory/embedding-service';

export const CANNIBALIZATION_SIMILARITY_THRESHOLD = 0.7;

export type UniquenessCheckResult = {
  isUnique: boolean;
  similarityScore: number;
  conflictingPostId?: string;
  conflictingContentId?: string;
  source: 'qdrant' | 'postgres' | 'none';
  checkedAgainst: number;
};

export type CannibalizationWarning = {
  code: 'CANNIBALIZATION_DETECTED';
  message: string;
  result: UniquenessCheckResult;
};

type RecentPost = {
  id: string;
  postId: string | null;
  text: string;
};

function hashTextToVector(text: string, dimensions = 64): number[] {
  const vector = new Array(dimensions).fill(0);
  for (let i = 0; i < text.length; i += 1) {
    vector[i % dimensions] += text.charCodeAt(i) / 255;
  }
  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
  return vector.map((v) => v / magnitude);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  if (len === 0) return 0;

  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < len; i += 1) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

function extractCaptionText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (content && typeof content === 'object') {
    const record = content as Record<string, unknown>;
    if (typeof record.caption === 'string') return record.caption;
    return JSON.stringify(record);
  }
  return '';
}

async function fetchRecentPostsFromPostgres(
  workspaceId: string,
  limit = 50,
): Promise<RecentPost[]> {
  const { data, error } = await supabaseAdmin
    .from('ai_cmo_content_pieces')
    .select('id, post_id, content, created_at')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data?.length) {
    return [];
  }

  return (data as Array<{ id: string; post_id: string | null; content: unknown }>).map((row) => ({
    id: row.id,
    postId: row.post_id,
    text: extractCaptionText(row.content),
  }));
}

async function checkViaQdrant(
  content: string,
  workspaceId: string,
): Promise<UniquenessCheckResult | null> {
  if (!process.env.QDRANT_URL) return null;

  const collection = buildQdrantCollectionName(workspaceId, 'content');
  try {
    const vector = await generateEmbedding(content);
    const hits = await searchVectors(collection, vector, 5);

    if (!hits.length) return null;

    const top = hits[0]!;
    return {
      isUnique: top.score <= CANNIBALIZATION_SIMILARITY_THRESHOLD,
      similarityScore: top.score,
      conflictingPostId:
        typeof top.payload.post_id === 'string' ? top.payload.post_id : undefined,
      conflictingContentId: top.id,
      source: 'qdrant',
      checkedAgainst: hits.length,
    };
  } catch {
    return null;
  }
}

function checkViaPostgres(content: string, posts: RecentPost[]): UniquenessCheckResult {
  if (!posts.length) {
    return {
      isUnique: true,
      similarityScore: 0,
      source: 'postgres',
      checkedAgainst: 0,
    };
  }

  const contentVector = hashTextToVector(content.toLowerCase());
  let maxSimilarity = 0;
  let conflictingPost: RecentPost | undefined;

  for (const post of posts) {
    if (!post.text.trim()) continue;
    const similarity = cosineSimilarity(contentVector, hashTextToVector(post.text.toLowerCase()));
    if (similarity > maxSimilarity) {
      maxSimilarity = similarity;
      conflictingPost = post;
    }
  }

  return {
    isUnique: maxSimilarity <= CANNIBALIZATION_SIMILARITY_THRESHOLD,
    similarityScore: Number(maxSimilarity.toFixed(4)),
    conflictingPostId: conflictingPost?.postId ?? undefined,
    conflictingContentId: conflictingPost?.id,
    source: 'postgres',
    checkedAgainst: posts.length,
  };
}

export class UniquenessGuard {
  async check(content: string, workspaceId: string): Promise<UniquenessCheckResult> {
    const trimmed = content.trim();
    if (!trimmed) {
      return {
        isUnique: true,
        similarityScore: 0,
        source: 'none',
        checkedAgainst: 0,
      };
    }

    const qdrantResult = await checkViaQdrant(trimmed, workspaceId);
    if (qdrantResult) {
      return qdrantResult;
    }

    const posts = await fetchRecentPostsFromPostgres(workspaceId);
    return checkViaPostgres(trimmed, posts);
  }

  toWarning(result: UniquenessCheckResult): CannibalizationWarning | null {
    if (result.isUnique) return null;

    return {
      code: 'CANNIBALIZATION_DETECTED',
      message: `Content similarity ${Math.round(result.similarityScore * 100)}% exceeds ${Math.round(CANNIBALIZATION_SIMILARITY_THRESHOLD * 100)}% threshold — revise to avoid SEO cannibalization`,
      result,
    };
  }
}

export const uniquenessGuard = new UniquenessGuard();

export async function checkContentUniqueness(
  content: string,
  workspaceId: string,
): Promise<UniquenessCheckResult> {
  return uniquenessGuard.check(content, workspaceId);
}

export const uniquenessGuardUtils = {
  UniquenessGuard,
  uniquenessGuard,
  checkContentUniqueness,
  cosineSimilarity,
  CANNIBALIZATION_SIMILARITY_THRESHOLD,
};
