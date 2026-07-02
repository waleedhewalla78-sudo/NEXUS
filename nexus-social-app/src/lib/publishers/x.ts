import type {
  PublishablePost,
  PublishPlatform,
  PublishResult,
  SocialConnectionRecord,
  SocialPublisher,
} from './types';

class XPublisher implements SocialPublisher {
  readonly platform: PublishPlatform = 'x';

  async publish(_args: {
    post: PublishablePost;
    connection: SocialConnectionRecord;
    accessToken: string;
  }): Promise<PublishResult> {
    throw new Error(
      'X (Twitter) publishing is not enabled yet. Complete X API approval and OAuth setup.',
    );
  }
}

export const xPublisher = new XPublisher();

export type XPublishArgs = {
  post: PublishablePost;
  connection: SocialConnectionRecord;
  accessToken: string;
};
