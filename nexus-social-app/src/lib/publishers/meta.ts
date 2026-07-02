import type {
  PostContent,
  PublishablePost,
  PublishPlatform,
  PublishResult,
  SocialConnectionRecord,
  SocialPublisher,
} from './types';

const GRAPH_VERSION = process.env.FACEBOOK_GRAPH_API_VERSION ?? 'v21.0';

type GraphErrorBody = {
  error?: { message?: string; type?: string; code?: number };
};

async function graphPost<T extends GraphErrorBody>(
  url: string,
  body: URLSearchParams,
): Promise<T & { id?: string; post_id?: string }> {
  const response = await fetch(url, { method: 'POST', body });
  const json = (await response.json()) as T & { id?: string; post_id?: string };
  if (!response.ok) {
    throw new Error(json.error?.message ?? `Graph API failed: HTTP ${response.status}`);
  }
  return json;
}

async function publishFacebookFeed({
  pageId,
  accessToken,
  message,
}: {
  pageId: string;
  accessToken: string;
  message: string;
}) {
  const base = `https://graph.facebook.com/${GRAPH_VERSION}`;
  const body = new URLSearchParams({ message, access_token: accessToken });
  const json = await graphPost(`${base}/${pageId}/feed`, body);
  return { id: json.id ?? 'unknown', kind: 'feed' as const };
}

async function publishFacebookPhoto({
  pageId,
  accessToken,
  message,
  mediaUrl,
}: {
  pageId: string;
  accessToken: string;
  message: string;
  mediaUrl: string;
}) {
  const base = `https://graph.facebook.com/${GRAPH_VERSION}`;
  const body = new URLSearchParams({
    url: mediaUrl,
    caption: message,
    access_token: accessToken,
  });
  const json = await graphPost(`${base}/${pageId}/photos`, body);
  return { id: json.post_id ?? json.id ?? 'unknown', kind: 'photo' as const };
}

async function publishInstagramContainer({
  igUserId,
  accessToken,
  message,
  mediaUrl,
}: {
  igUserId: string;
  accessToken: string;
  message: string;
  mediaUrl: string;
}) {
  const base = `https://graph.facebook.com/${GRAPH_VERSION}`;
  const createBody = new URLSearchParams({
    image_url: mediaUrl,
    caption: message,
    access_token: accessToken,
  });
  const container = await graphPost(`${base}/${igUserId}/media`, createBody);
  const publishBody = new URLSearchParams({
    creation_id: container.id ?? '',
    access_token: accessToken,
  });
  const published = await graphPost(`${base}/${igUserId}/media_publish`, publishBody);
  return { id: published.id ?? 'unknown', kind: 'instagram' as const };
}

function extractContent(content: PostContent | null | undefined) {
  const message = content?.text?.trim() ?? '';
  const mediaUrls = Array.isArray(content?.media_urls)
    ? content.media_urls.filter((url): url is string => typeof url === 'string' && url.length > 0)
    : [];
  return { message, mediaUrls };
}

async function publishMeta({
  platform,
  post,
  connection,
  accessToken,
}: {
  platform: 'facebook' | 'instagram';
  post: PublishablePost;
  connection: SocialConnectionRecord;
  accessToken: string;
}): Promise<PublishResult> {
  const { message, mediaUrls } = extractContent(post.content);
  if (!message && mediaUrls.length === 0) {
    throw new Error('Post has no text or media to publish');
  }

  if (platform === 'instagram') {
    const igUserId =
      (connection.metadata?.instagram_business_account_id as string | undefined) ??
      connection.account_id;
    if (mediaUrls.length === 0) {
      throw new Error('Instagram publishing requires at least one image URL');
    }
    const result = await publishInstagramContainer({
      igUserId,
      accessToken,
      message,
      mediaUrl: mediaUrls[0],
    });
    return {
      externalPostId: result.id,
      permalink: `https://www.instagram.com/p/${result.id}/`,
      connectionId: connection.id,
    };
  }

  const pageId = connection.account_id;
  const result =
    mediaUrls.length > 0
      ? await publishFacebookPhoto({
          pageId,
          accessToken,
          message,
          mediaUrl: mediaUrls[0],
        })
      : await publishFacebookFeed({ pageId, accessToken, message });

  return {
    externalPostId: result.id,
    permalink: `https://www.facebook.com/${result.id}`,
    connectionId: connection.id,
  };
}

class MetaPublisher implements SocialPublisher {
  readonly platform: PublishPlatform = 'facebook';

  async publish({
    post,
    connection,
    accessToken,
  }: {
    post: PublishablePost;
    connection: SocialConnectionRecord;
    accessToken: string;
  }): Promise<PublishResult> {
    const targetPlatform = connection.platform === 'instagram' ? 'instagram' : 'facebook';
    return publishMeta({ platform: targetPlatform, post, connection, accessToken });
  }
}

export const metaPublisher = new MetaPublisher();

export const metaPublisherUtils = {
  publishFacebookFeed,
  publishFacebookPhoto,
  publishInstagramContainer,
  extractContent,
};
