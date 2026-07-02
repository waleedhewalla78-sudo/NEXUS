export type PlatformLimit = {
  maxChars: number;
  maxMedia: number;
  requiresMedia?: boolean;
};

export const PLATFORM_LIMITS: Record<string, PlatformLimit> = {
  Twitter: { maxChars: 280, maxMedia: 4 },
  LinkedIn: { maxChars: 3000, maxMedia: 9 },
  Instagram: { maxChars: 2200, maxMedia: 10, requiresMedia: true },
  Facebook: { maxChars: 63206, maxMedia: 10 },
  YouTube: { maxChars: 5000, maxMedia: 1 },
  TikTok: { maxChars: 2200, maxMedia: 1 },
};

function validatePlatform({
  platform,
  textLength,
  mediaCount,
}: {
  platform: string;
  textLength: number;
  mediaCount: number;
}): string[] {
  const limits = PLATFORM_LIMITS[platform];
  if (!limits) return [];

  const errors: string[] = [];
  if (textLength > limits.maxChars) {
    errors.push(`${platform}: text exceeds ${limits.maxChars} characters (${textLength})`);
  }
  if (mediaCount > limits.maxMedia) {
    errors.push(`${platform}: max ${limits.maxMedia} media items (${mediaCount} attached)`);
  }
  if (limits.requiresMedia && mediaCount === 0 && textLength === 0) {
    errors.push(`${platform}: requires text or at least one image`);
  }
  if (limits.requiresMedia && mediaCount === 0 && textLength > 0) {
    errors.push(`${platform}: requires at least one image`);
  }
  return errors;
}

export const platformLimitsUtils = {
  validatePlatforms({
    platforms,
    textLength,
    mediaCount,
  }: {
    platforms: string[];
    textLength: number;
    mediaCount: number;
  }): string[] {
    return platforms.flatMap((platform) =>
      validatePlatform({ platform, textLength, mediaCount }),
    );
  },
};
