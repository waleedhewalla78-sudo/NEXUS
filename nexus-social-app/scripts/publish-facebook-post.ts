/**
 * One-shot publish: load a saved Nexus post and push it to a Facebook Page via Graph API.
 *
 * Usage:
 *   npm run facebook:publish -- e0d9da20-97b6-49bb-af33-36ef4f714aab
 *
 * Required in .env.local:
 *   FACEBOOK_PAGE_ACCESS_TOKEN  — Page token with pages_manage_posts
 *   FACEBOOK_PAGE_ID            — Numeric Page ID (not a facebook.com/share/p/ URL)
 *   SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_* + service role)
 */
import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));

function loadEnvFile(relativePath: string) {
  const full = join(scriptDir, '..', relativePath);
  if (!existsSync(full)) return;
  for (const line of readFileSync(full, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile('.env');
loadEnvFile('.env.local');

const GRAPH_VERSION = process.env.FACEBOOK_GRAPH_API_VERSION ?? 'v21.0';

interface PostContent {
  text?: string;
  media_urls?: string[];
}

interface GraphErrorBody {
  error?: { message?: string; type?: string; code?: number };
}

async function publishToFacebookPage({
  pageId,
  accessToken,
  message,
  mediaUrls,
}: {
  pageId: string;
  accessToken: string;
  message: string;
  mediaUrls: string[];
}) {
  const base = `https://graph.facebook.com/${GRAPH_VERSION}`;

  if (mediaUrls.length > 0) {
    const photoUrl = `${base}/${pageId}/photos`;
    const body = new URLSearchParams({
      url: mediaUrls[0],
      caption: message,
      access_token: accessToken,
    });
    const res = await fetch(photoUrl, { method: 'POST', body });
    const json = (await res.json()) as GraphErrorBody & { id?: string; post_id?: string };
    if (!res.ok) {
      throw new Error(json.error?.message ?? `Graph API photos failed: HTTP ${res.status}`);
    }
    return { id: json.post_id ?? json.id ?? 'unknown', kind: 'photo' as const };
  }

  const feedUrl = `${base}/${pageId}/feed`;
  const body = new URLSearchParams({
    message,
    access_token: accessToken,
  });
  const res = await fetch(feedUrl, { method: 'POST', body });
  const json = (await res.json()) as GraphErrorBody & { id?: string };
  if (!res.ok) {
    throw new Error(json.error?.message ?? `Graph API feed failed: HTTP ${res.status}`);
  }
  return { id: json.id ?? 'unknown', kind: 'feed' as const };
}

async function main() {
  const postId = process.argv[2] ?? process.env.FACEBOOK_PUBLISH_POST_ID;
  const pageToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN ?? '';
  const pageId = process.env.FACEBOOK_PAGE_ID ?? '';

  if (!pageToken || !pageId) {
    console.error('[facebook] Missing credentials in .env.local:');
    if (!pageToken) console.error('  - FACEBOOK_PAGE_ACCESS_TOKEN');
    if (!pageId) console.error('  - FACEBOOK_PAGE_ID');
    console.error('[facebook] See .env.example for setup notes. Cannot publish without a Page token and numeric Page ID.');
    process.exit(1);
  }

  if (!postId) {
    console.error('[facebook] Pass a post UUID: npm run facebook:publish -- <post-id>');
    process.exit(1);
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

  if (!supabaseUrl || !serviceKey) {
    console.error('[facebook] Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to load the post.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: post, error } = await supabase
    .from('posts')
    .select('id, content, platforms, status')
    .eq('id', postId)
    .maybeSingle();

  if (error) {
    console.error('[facebook] Supabase error:', error.message);
    process.exit(1);
  }

  if (!post) {
    console.error(`[facebook] Post not found: ${postId}`);
    process.exit(1);
  }

  const content = (post.content as PostContent | null) ?? {};
  const message = content.text?.trim() ?? '';
  const mediaUrls = Array.isArray(content.media_urls)
    ? content.media_urls.filter((u): u is string => typeof u === 'string' && u.length > 0)
    : [];

  if (!message && mediaUrls.length === 0) {
    console.error('[facebook] Post has no text or media to publish.');
    process.exit(1);
  }

  const platforms = (post.platforms as string[] | null) ?? [];
  const hasFacebook = platforms.some((p) => p.toLowerCase() === 'facebook');
  if (!hasFacebook) {
    console.warn('[facebook] Post platforms:', platforms.join(', ') || '(none)');
    console.warn('[facebook] Continuing anyway — post was not tagged for Facebook.');
  }

  console.log(`[facebook] Publishing post ${postId} to Page ${pageId} (${GRAPH_VERSION})...`);

  const result = await publishToFacebookPage({
    pageId,
    accessToken: pageToken,
    message,
    mediaUrls,
  });

  console.log(`[facebook] Published (${result.kind}). Facebook object id: ${result.id}`);

  const { error: updateError } = await supabase
    .from('posts')
    .update({ status: 'published' })
    .eq('id', postId);

  if (updateError) {
    console.warn('[facebook] Posted to Facebook but failed to update local status:', updateError.message);
  } else {
    console.log('[facebook] Local post status set to published.');
  }
}

main().catch((err: unknown) => {
  console.error('[facebook]', err instanceof Error ? err.message : err);
  process.exit(1);
});
