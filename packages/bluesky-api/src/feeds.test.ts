import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

import { BlueskyFeeds } from './feeds';
import type { BlueskyBookmarksResponse } from './types';

describe('BlueskyFeeds', () => {
  class MockFeeds extends BlueskyFeeds {
    public makeAuthenticatedRequestMock = jest.fn();
    public makeRequestMock = jest.fn();
    public uploadImageMock = jest.fn();

    constructor() {
      super('https://pds.example');
    }

    protected async makeRequest<T>(
      endpoint: string,
      options: {
        method?: 'GET' | 'POST';
        headers?: Record<string, string>;
        body?: Record<string, unknown> | FormData | Blob;
        params?: Record<string, string>;
      } = {},
    ): Promise<T> {
      return this.makeRequestMock(endpoint, options);
    }

    protected async makeAuthenticatedRequest<T>(
      endpoint: string,
      accessJwt: string,
      options: {
        method?: 'GET' | 'POST';
        headers?: Record<string, string>;
        body?: {
          repo?: string;
          collection?: string;
          record?: Record<string, unknown>;
          [key: string]: unknown;
        };
        params?: Record<string, string>;
      } = {},
    ): Promise<T> {
      return this.makeAuthenticatedRequestMock(endpoint, accessJwt, options);
    }

    async uploadImage(
      accessJwt: string,
      imageUri: string,
      mimeType: string,
    ): Promise<{
      blob: {
        ref: { $link: string };
        mimeType: string;
        size: number;
      };
    }> {
      return this.uploadImageMock(accessJwt, imageUri, mimeType);
    }
  }

  class UploadImageFeeds extends BlueskyFeeds {
    public lastCall?: {
      endpoint: string;
      accessJwt: string;
      options: {
        method?: 'GET' | 'POST';
        headers?: Record<string, string>;
        body?: Blob;
        params?: Record<string, string>;
      };
    };

    public response: unknown;

    constructor() {
      super('https://pds.example');
    }

    protected async makeAuthenticatedRequest<T>(
      endpoint: string,
      accessJwt: string,
      options: {
        method?: 'GET' | 'POST';
        headers?: Record<string, string>;
        body?: Blob;
        params?: Record<string, string>;
      } = {},
    ): Promise<T> {
      this.lastCall = { endpoint, accessJwt, options };
      return this.response as T;
    }
  }

  const server = setupServer();

  beforeAll(() => server.listen());

  afterEach(() => {
    server.resetHandlers();
    jest.restoreAllMocks();
  });

  afterAll(() => server.close());

  it('fetches trending topics with a custom limit', async () => {
    const feeds = new MockFeeds();
    const trending = {
      topics: [
        { topic: 'Cory Booker', link: '/profile/trending.bsky.app/feed/417836453' },
        { topic: 'Luigi Mangione', link: '/profile/trending.bsky.app/feed/417636752' },
      ],
      suggested: [{ topic: 'Popular with Friends', link: '/profile/bsky.app/feed/with-friends' }],
    };
    feeds.makeRequestMock.mockResolvedValueOnce(trending);

    const result = await feeds.getTrendingTopics(14);

    expect(result).toEqual(trending);
    expect(feeds.makeRequestMock).toHaveBeenCalledWith('/app.bsky.unspecced.getTrendingTopics', {
      params: { limit: '14' },
    });
  });

  it('fetches trending topics with the default limit', async () => {
    const feeds = new MockFeeds();
    const trending = {
      topics: [],
      suggested: [],
    };
    feeds.makeRequestMock.mockResolvedValueOnce(trending);

    const result = await feeds.getTrendingTopics();

    expect(result).toEqual(trending);
    expect(feeds.makeRequestMock).toHaveBeenCalledWith('/app.bsky.unspecced.getTrendingTopics', {
      params: { limit: '10' },
    });
  it('fetches bookmarks with default parameters', async () => {
    const feeds = new MockFeeds();
    const response: BlueskyBookmarksResponse = { bookmarks: [] };
    feeds.makeAuthenticatedRequestMock.mockResolvedValueOnce(response);

    const result = await feeds.getBookmarks('jwt');

    expect(result).toBe(response);
    expect(feeds.makeAuthenticatedRequestMock).toHaveBeenCalledWith(
      '/app.bsky.bookmark.getBookmarks',
      'jwt',
      { params: { limit: '50' } },
    );
  });

  it('fetches bookmarks with custom limit and cursor', async () => {
    const feeds = new MockFeeds();
    const response: BlueskyBookmarksResponse = { bookmarks: [], cursor: 'next' };
    feeds.makeAuthenticatedRequestMock.mockResolvedValueOnce(response);

    const result = await feeds.getBookmarks('jwt', 25, 'cursor123');

    expect(result).toBe(response);
    expect(feeds.makeAuthenticatedRequestMock).toHaveBeenCalledWith(
      '/app.bsky.bookmark.getBookmarks',
      'jwt',
      { params: { limit: '25', cursor: 'cursor123' } },
    );
  });

  it('returns a post from a thread response', async () => {
    const feeds = new MockFeeds();
    const post = { uri: 'at://post/1', cid: 'cid', text: 'hello' };
    feeds.makeAuthenticatedRequestMock.mockResolvedValueOnce({ thread: { post } });

    const result = await feeds.getPost('jwt', 'at://post/1');

    expect(result).toEqual(post);
    expect(feeds.makeAuthenticatedRequestMock).toHaveBeenCalledWith(
      '/app.bsky.feed.getPostThread',
      'jwt',
      { params: { uri: 'at://post/1' } },
    );
  });

  it('throws when a post is missing in thread response', async () => {
    const feeds = new MockFeeds();
    feeds.makeAuthenticatedRequestMock.mockResolvedValueOnce({ thread: {} });

    await expect(feeds.getPost('jwt', 'at://post/missing')).rejects.toThrow('Post not found');
  });

  it('throws when unlikePost is called with an invalid URI', async () => {
    const feeds = new MockFeeds();

    await expect(feeds.unlikePost('jwt', 'invalid/', 'did:example')).rejects.toThrow(
      'Invalid like URI: could not extract rkey',
    );
    expect(feeds.makeAuthenticatedRequestMock).not.toHaveBeenCalled();
  });

  it('creates posts with image embeds', async () => {
    const feeds = new MockFeeds();
    const imageBlobOne = { ref: { $link: 'blob-1' }, mimeType: 'image/png', size: 10 };
    const imageBlobTwo = { ref: { $link: 'blob-2' }, mimeType: 'image/jpeg', size: 20 };
    feeds.uploadImageMock
      .mockResolvedValueOnce({ blob: imageBlobOne })
      .mockResolvedValueOnce({ blob: imageBlobTwo });

    const response = { uri: 'at://post/created', cid: 'cid' };
    feeds.makeAuthenticatedRequestMock.mockResolvedValueOnce(response);

    const result = await feeds.createPost('jwt', 'did:example', {
      text: 'A post with images',
      images: [
        { uri: 'file://one.png', alt: 'One', mimeType: 'image/png' },
        { uri: 'file://two.jpg', alt: 'Two', mimeType: 'image/jpeg' },
      ],
    });

    expect(result).toBe(response);
    expect(feeds.uploadImageMock).toHaveBeenNthCalledWith(1, 'jwt', 'file://one.png', 'image/png');
    expect(feeds.uploadImageMock).toHaveBeenNthCalledWith(2, 'jwt', 'file://two.jpg', 'image/jpeg');

    const call = feeds.makeAuthenticatedRequestMock.mock.calls[0];
    expect(call[0]).toBe('/com.atproto.repo.createRecord');
    expect(call[1]).toBe('jwt');
    const options = call[2];
    expect(options.method).toBe('POST');
    expect(options.body.repo).toBe('did:example');
    expect(options.body.collection).toBe('app.bsky.feed.post');
    const record = options.body.record as Record<string, unknown>;
    expect(record.text).toBe('A post with images');
    expect(record.$type).toBe('app.bsky.feed.post');
    expect(record.langs).toEqual(['en']);
    expect(record.createdAt).toEqual(expect.any(String));
    expect(record.embed).toEqual({
      $type: 'app.bsky.embed.images',
      images: [
        { alt: 'One', image: imageBlobOne },
        { alt: 'Two', image: imageBlobTwo },
      ],
    });
  });

  it('creates posts with GIF embeds as external media', async () => {
    const feeds = new MockFeeds();
    const thumbnailBlob = { ref: { $link: 'thumb' }, mimeType: 'image/jpeg', size: 30 };
    feeds.uploadImageMock.mockResolvedValueOnce({ blob: thumbnailBlob });

    const response = { uri: 'at://post/gif', cid: 'cid' };
    feeds.makeAuthenticatedRequestMock.mockResolvedValueOnce(response);

    const result = await feeds.createPost('jwt', 'did:example', {
      text: 'GIF post',
      images: [
        { uri: 'https://gif.example/gif.gif', alt: 'Funny gif', mimeType: 'image/gif', tenorId: '123' },
      ],
    });

    expect(result).toBe(response);
    expect(feeds.uploadImageMock).toHaveBeenCalledWith('jwt', 'https://gif.example/gif.gif', 'image/jpeg');

    const [, , options] = feeds.makeAuthenticatedRequestMock.mock.calls[0];
    const record = options.body.record as Record<string, unknown>;
    expect(record.embed).toEqual({
      $type: 'app.bsky.embed.external',
      external: {
        uri: 'https://gif.example/gif.gif',
        title: 'Funny gif',
        description: 'Alt: Funny gif',
        thumb: {
          $type: 'blob',
          ref: thumbnailBlob.ref,
          mimeType: thumbnailBlob.mimeType,
          size: thumbnailBlob.size,
        },
      },
    });
  });

  it('uploads images and forwards blobs to the upload endpoint', async () => {
    let imageRequestUrl: string | null = null;

    server.use(
      http.get('https://cdn.example/image.png', async () => {
        imageRequestUrl = 'https://cdn.example/image.png';
        const blob = new Blob(['binary'], { type: 'image/png' });
        const buffer = await blob.arrayBuffer();
        return HttpResponse.arrayBuffer(buffer, {
          headers: { 'Content-Type': 'image/png' },
        });
      }),
    );

    const feeds = new UploadImageFeeds();
    const response = {
      blob: {
        ref: { $link: 'uploaded' },
        mimeType: 'image/png',
        size: 42,
      },
    };
    feeds.response = response;

    const result = await feeds.uploadImage('jwt', 'https://cdn.example/image.png', 'image/png');

    expect(result).toEqual(response);
    expect(imageRequestUrl).toBe('https://cdn.example/image.png');
    expect(feeds.lastCall?.endpoint).toBe('/com.atproto.repo.uploadBlob');
    expect(feeds.lastCall?.accessJwt).toBe('jwt');
    expect(feeds.lastCall?.options.headers).toEqual({ 'Content-Type': 'image/png' });
    expect(feeds.lastCall?.options.body).toBeInstanceOf(Blob);
    expect(feeds.lastCall?.options.body?.type).toBe('image/png');
  });
});
