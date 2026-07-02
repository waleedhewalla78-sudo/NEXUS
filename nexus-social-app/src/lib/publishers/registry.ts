import { linkedinPublisher } from './linkedin';
import { metaPublisher } from './meta';
import { xPublisher } from './x';
import { NotImplementedPublishPlatformError } from './errors';
import type { PublishPlatform, SocialPublisher } from './types';

export function getPublisher(platform: PublishPlatform): SocialPublisher {
  switch (platform) {
    case 'facebook':
    case 'instagram':
      return metaPublisher;
    case 'linkedin':
      return linkedinPublisher;
    case 'x':
      return xPublisher;
    case 'tiktok':
    case 'snapchat':
      throw new NotImplementedPublishPlatformError(platform);
    default: {
      const exhaustive: never = platform;
      throw new Error(`Unsupported platform: ${exhaustive}`);
    }
  }
}

export const publisherAdapter = {
  getPublisher,
};
