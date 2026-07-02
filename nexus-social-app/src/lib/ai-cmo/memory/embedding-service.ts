// INSTALL: npm install openai
/**
 * L5 — Embedding generation via OpenRouter (OpenAI-compatible API).
 */

import OpenAI from 'openai';

const EMBEDDING_MODEL = 'openai/text-embedding-ada-002';
const EMBEDDING_DIMENSIONS = 1536;

let cachedClient: OpenAI | null = null;

function getEmbeddingClient(): OpenAI {
  if (cachedClient) return cachedClient;

  const apiKey = process.env.OPENROUTER_API_KEY ?? process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY or OPENAI_API_KEY required for embeddings');
  }

  cachedClient = new OpenAI({
    apiKey,
    baseURL: process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'https://nexus.local',
      'X-Title': 'Nexus Social AI CMO',
    },
  });

  return cachedClient;
}

export function embeddingDimensions(): number {
  return EMBEDDING_DIMENSIONS;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const normalized = text.trim().slice(0, 8000);
  if (!normalized) {
    return new Array(EMBEDDING_DIMENSIONS).fill(0);
  }

  const client = getEmbeddingClient();
  const response = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: normalized,
  });

  const vector = response.data[0]?.embedding;
  if (!vector?.length) {
    throw new Error('Embedding API returned empty vector');
  }

  return vector;
}

export const embeddingService = {
  generateEmbedding,
  embeddingDimensions,
};
