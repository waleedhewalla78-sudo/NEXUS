// INSTALL: npm install cheerio
/**
 * Feature 004 Sprint 16 — Knowledge Hub web scraper adapter.
 */

import * as cheerio from 'cheerio';
import { generateEmbedding } from '@/lib/ai-cmo/memory/embedding-service';
import { buildQdrantCollectionName, upsertVectors } from '@/lib/ai-cmo/memory/qdrant-client';

const CHUNK_SIZE = 1000;

export type WebScrapeResult = {
  url: string;
  chunksIndexed: number;
  collection: string;
};

function chunkText(text: string, size = CHUNK_SIZE): string[] {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return [];

  const chunks: string[] = [];
  for (let i = 0; i < normalized.length; i += size) {
    chunks.push(normalized.slice(i, i + size));
  }
  return chunks;
}

export async function extractTextFromUrl(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Nexus-KnowledgeHub/1.0' },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  $('script, style, nav, footer, header').remove();
  return $('body').text().replace(/\s+/g, ' ').trim();
}

export async function ingestUrlToKnowledge(params: {
  workspaceId: string;
  url: string;
}): Promise<WebScrapeResult> {
  const text = await extractTextFromUrl(params.url);
  const chunks = chunkText(text);
  const collection = buildQdrantCollectionName(params.workspaceId, 'knowledge');

  const points = await Promise.all(
    chunks.map(async (chunk, index) => ({
      id: `${params.workspaceId}_${index}_${Date.now()}`,
      vector: await generateEmbedding(chunk),
      payload: {
        source_url: params.url,
        chunk_index: index,
        text: chunk,
        workspace_id: params.workspaceId,
        ingested_at: new Date().toISOString(),
      },
    })),
  );

  if (points.length) {
    await upsertVectors(collection, points);
  }

  return {
    url: params.url,
    chunksIndexed: points.length,
    collection,
  };
}
