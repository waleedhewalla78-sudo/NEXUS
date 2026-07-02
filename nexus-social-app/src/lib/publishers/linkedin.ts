import type {
  PostContent,
  PublishablePost,
  PublishPlatform,
  PublishResult,
  SocialConnectionRecord,
  SocialPublisher,
} from './types';

function extractMediaUrls(content: PostContent | null | undefined): string[] {
  return Array.isArray(content?.media_urls)
    ? content.media_urls.filter((url): url is string => typeof url === 'string' && url.length > 0)
    : [];
}

class LinkedInPublisher implements SocialPublisher {
  readonly platform: PublishPlatform = 'linkedin';

  async publish({
    post,
    connection,
    accessToken,
  }: {
    post: PublishablePost;
    connection: SocialConnectionRecord;
    accessToken: string;
  }): Promise<PublishResult> {
    const message = post.content?.text?.trim() ?? '';
    if (!message) {
      throw new Error('LinkedIn posts require text content');
    }

    const mediaUrls = extractMediaUrls(post.content);
    const shareMediaCategory = mediaUrls.length > 0 ? 'IMAGE' : 'NONE';
    const media = mediaUrls.length
      ? mediaUrls.map((url) => ({
          status: 'READY',
          originalUrl: url,
        }))
      : undefined;

    const authorUrn =
      (connection.metadata?.author_urn as string | undefined) ??
      `urn:li:organization:${connection.account_id}`;

    const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify({
        author: authorUrn,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: message },
            shareMediaCategory,
            ...(media ? { media } : {}),
          },
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
        },
      }),
    });

    const json = (await response.json()) as { id?: string; message?: string; status?: number };
    if (!response.ok) {
      throw new Error(json.message ?? `LinkedIn API failed: HTTP ${response.status}`);
    }

    return {
      externalPostId: json.id ?? 'unknown',
      connectionId: connection.id,
    };
  }
}

export const linkedinPublisher = new LinkedInPublisher();
