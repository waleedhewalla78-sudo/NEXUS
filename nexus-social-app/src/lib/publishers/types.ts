export type PublishPlatform =
  | 'facebook'
  | 'instagram'
  | 'linkedin'
  | 'x'
  | 'tiktok'
  | 'snapchat';

/** Platforms with live publish adapters in this repo. */
export type ImplementedPublishPlatform = 'facebook' | 'instagram' | 'linkedin' | 'x';

export const IMPLEMENTED_PUBLISH_PLATFORMS: ImplementedPublishPlatform[] = [
  'facebook',
  'instagram',
  'linkedin',
  'x',
];

export type PostContent = {
  text?: string;
  media_urls?: string[];
};

export type SocialConnectionRecord = {
  id: string;
  workspace_id: string;
  platform: PublishPlatform;
  account_id: string;
  account_name: string | null;
  account_handle: string | null;
  access_token_enc: string;
  token_iv: string;
  token_tag: string;
  metadata: Record<string, unknown> | null;
};

export type PublishablePost = {
  id: string;
  workspace_id: string;
  platforms: string[];
  content: PostContent;
  scheduled_at: string | null;
};

export type PublishResult = {
  externalPostId: string;
  permalink?: string;
  connectionId?: string;
};

export interface SocialPublisher {
  readonly platform: PublishPlatform;
  publish({
    post,
    connection,
    accessToken,
  }: {
    post: PublishablePost;
    connection: SocialConnectionRecord;
    accessToken: string;
  }): Promise<PublishResult>;
}

export function normalizePlatformName(raw: string): PublishPlatform | null {
  const value = raw.trim().toLowerCase();
  if (value === 'facebook') return 'facebook';
  if (value === 'instagram') return 'instagram';
  if (value === 'linkedin') return 'linkedin';
  if (value === 'twitter' || value === 'x') return 'x';
  if (value === 'tiktok') return 'tiktok';
  if (value === 'snapchat') return 'snapchat';
  return null;
}

export function isImplementedPublishPlatform(
  platform: PublishPlatform,
): platform is ImplementedPublishPlatform {
  return IMPLEMENTED_PUBLISH_PLATFORMS.includes(platform as ImplementedPublishPlatform);
}
