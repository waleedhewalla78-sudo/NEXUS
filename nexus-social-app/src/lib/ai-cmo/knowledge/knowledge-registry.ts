/**
 * Feature 004 Phase 6 — Knowledge Hub source registry.
 */

import {
  extractTextFromUrl,
  ingestUrlToKnowledge,
  type WebScrapeResult,
} from '@/lib/ai-cmo/knowledge/adapters/web-scraper.adapter';

export type KnowledgeSourceType = 'web_url';

export type KnowledgeIngestInput = {
  workspaceId: string;
  sourceType: KnowledgeSourceType;
  sourceRef: string;
};

export type KnowledgeIngestResult = {
  sourceType: KnowledgeSourceType;
  sourceRef: string;
  chunksIndexed: number;
  collection: string;
};

export interface KnowledgeSourceAdapter {
  readonly type: KnowledgeSourceType;
  fetchContent(sourceRef: string): Promise<string>;
  parseContent(raw: string): string[];
  ingest(input: KnowledgeIngestInput): Promise<KnowledgeIngestResult>;
}

const CHUNK_SIZE = 1000;

function chunkText(text: string, size = CHUNK_SIZE): string[] {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return [];
  const chunks: string[] = [];
  for (let i = 0; i < normalized.length; i += size) {
    chunks.push(normalized.slice(i, i + size));
  }
  return chunks;
}

export class WebUrlKnowledgeAdapter implements KnowledgeSourceAdapter {
  readonly type: KnowledgeSourceType = 'web_url';

  async fetchContent(sourceRef: string): Promise<string> {
    return extractTextFromUrl(sourceRef);
  }

  parseContent(raw: string): string[] {
    return chunkText(raw);
  }

  async ingest(input: KnowledgeIngestInput): Promise<KnowledgeIngestResult> {
    const result: WebScrapeResult = await ingestUrlToKnowledge({
      workspaceId: input.workspaceId,
      url: input.sourceRef,
    });
    return {
      sourceType: this.type,
      sourceRef: input.sourceRef,
      chunksIndexed: result.chunksIndexed,
      collection: result.collection,
    };
  }
}

const adapters = new Map<KnowledgeSourceType, KnowledgeSourceAdapter>([
  ['web_url', new WebUrlKnowledgeAdapter()],
]);

export function getKnowledgeAdapter(sourceType: KnowledgeSourceType): KnowledgeSourceAdapter {
  const adapter = adapters.get(sourceType);
  if (!adapter) {
    throw new Error(`Unknown knowledge source type: ${sourceType}`);
  }
  return adapter;
}

export function registerKnowledgeAdapter(adapter: KnowledgeSourceAdapter): void {
  adapters.set(adapter.type, adapter);
}

export async function ingestKnowledgeSource(
  input: KnowledgeIngestInput,
): Promise<KnowledgeIngestResult> {
  const adapter = getKnowledgeAdapter(input.sourceType);
  return adapter.ingest(input);
}

export const knowledgeRegistry = {
  getKnowledgeAdapter,
  registerKnowledgeAdapter,
  ingestKnowledgeSource,
  WebUrlKnowledgeAdapter,
};
