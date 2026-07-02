import type { CreatedContent } from '@/lib/ai-cmo/creator-agent';

function normalizeUrlList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((url): url is string => typeof url === 'string' && url.trim().length > 0);
}

/**
 * Resolve media_urls for posts table / publish adapters.
 * Sources: creator draftMetadata, optional media-assets signed URLs from campaign flow.
 */
export function resolvePostMediaUrls(content: CreatedContent): string[] {
  const meta = content.draftMetadata ?? {};
  const fromMeta = normalizeUrlList(meta.media_urls ?? meta.mediaUrls);
  if (fromMeta.length > 0) return fromMeta;

  const single = meta.media_url ?? meta.mediaUrl;
  if (typeof single === 'string' && single.trim()) return [single.trim()];

  return [];
}
