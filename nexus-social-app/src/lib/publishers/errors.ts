import type { PublishPlatform } from './types';

export class NotImplementedPublishPlatformError extends Error {
  readonly platform: PublishPlatform;

  constructor(platform: PublishPlatform) {
    super(`Publish adapter for "${platform}" is not implemented — skipping without worker crash`);
    this.name = 'NotImplementedPublishPlatformError';
    this.platform = platform;
  }
}
