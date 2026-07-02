import { afterEach, describe, expect, it, vi } from 'vitest';
import { metaPublisherUtils } from '../meta';

describe('MetaPublisher', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('extractContent returns text and media URLs', () => {
    const result = metaPublisherUtils.extractContent({
      text: ' Hello ',
      media_urls: ['https://cdn.example/photo.jpg', ''],
    });
    expect(result.message).toBe('Hello');
    expect(result.mediaUrls).toEqual(['https://cdn.example/photo.jpg']);
  });

  it('publishFacebookFeed posts message to Graph API', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'fb-post-123' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await metaPublisherUtils.publishFacebookFeed({
      pageId: '12345',
      accessToken: 'token',
      message: 'Hello world',
    });

    expect(result.id).toBe('fb-post-123');
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/12345/feed');
    expect(init?.method).toBe('POST');
  });

  it('publishFacebookFeed surfaces Graph API errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: { message: 'Invalid OAuth access token' } }),
      }),
    );

    await expect(
      metaPublisherUtils.publishFacebookFeed({
        pageId: '12345',
        accessToken: 'bad',
        message: 'Hello',
      }),
    ).rejects.toThrow('Invalid OAuth access token');
  });
});
