/**
 * L5/L7 — Post-reconciler learning vector indexer (T027).
 * Invoked from secure-reconciler-writer after successful ai_cmo_learnings writes.
 */

import { buildQdrantCollectionName, upsertVectors } from '@/lib/ai-cmo/memory/qdrant-client';
import { generateEmbedding } from '@/lib/ai-cmo/memory/embedding-service';

export async function indexLearningToQdrant(input: {
  workspaceId: string;
  learningId: string;
  learning: Record<string, unknown>;
}): Promise<void> {
  if (!process.env.QDRANT_URL) return;

  const contextText = JSON.stringify({
    context: input.learning.context,
    action: input.learning.action,
    outcome: input.learning.outcome,
    learning_type: input.learning.learning_type,
  });

  const vector = await generateEmbedding(contextText);
  const collection = buildQdrantCollectionName(input.workspaceId, 'learnings');

  await upsertVectors(collection, [
    {
      id: input.learningId,
      vector,
      payload: {
        ...input.learning,
        workspace_id: input.workspaceId,
        indexed_at: new Date().toISOString(),
      },
    },
  ]);
}
