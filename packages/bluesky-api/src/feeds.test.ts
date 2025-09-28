import { BlueskyFeeds } from './feeds';
import type {
  BlueskyBookmarksResponse,
  BlueskyCreatePostResponse,
  BlueskyFeedGeneratorsResponse,
  BlueskyFeedResponse,
  BlueskyFeedsResponse,
  BlueskyLikeResponse,
  BlueskyPostView,
  BlueskyStarterPacksResponse,
  BlueskyThreadResponse,
  BlueskyTrendingTopicsResponse,
  BlueskyUnlikeResponse,
  BlueskyUploadBlobResponse,
} from './types';

describe('BlueskyFeeds', () => {
  class TestFeeds extends BlueskyFeeds {
    public authCalls: {
      endpoint: string;
      accessJwt: string;
      options: {
        method?: 'GET' | 'POST';
        body?: Record<string, unknown> | FormData | Blob;
        params?: Record<string, string | string[]>;
        headers?: Record<string, string>;
      };
    }[] = [];

    public requestCalls: {
      endpoint: string;
      options: {
        method?: 'GET' | 'POST';
        body?: Record<string, unknown> | FormData | Blob;
        params?: Record<string, string | string[]>;
        headers?: Record<string, string>;
      };
    }[] = [];

    public responses: unknown[] = [];
    public uploadBlobResponses: BlueskyUploadBlobResponse[] = [];
    public uploadBlobCalls: { accessJwt: string; blob: Blob; mimeType: string }[] = [];

    constructor() {
      super('https://pds.example');
    }

    protected async makeAuthenticatedRequest<T>(
      endpoint: string,
      accessJwt: string,
      options: {
        method?: 'GET' | 'POST';
        body?: Record<string, unknown> | FormData | Blob;
        params?: Record<string, string | string[]>;
        headers?: Record<string, string>;
      } = {},
    ): Promise<T> {
      this.authCalls.push({ endpoint, accessJwt, options });
      return (this.responses.shift() as T) ?? (undefined as T);
    }

    protected async makeRequest<T>(
      endpoint: string,
      options: {
        method?: 'GET' | 'POST';
        body?: Record<string, unknown> | FormData | Blob;
        params?: Record<string, string | string[]>;
        headers?: Record<string, string>;
      } = {},
    ): Promise<T> {
      this.requestCalls.push({ endpoint, options });
      return (this.responses.shift() as T) ?? (undefined as T);
    }

    protected async uploadBlob(accessJwt: string, blob: Blob, mimeType: string): Promise<BlueskyUploadBlobResponse> {
      this.uploadBlobCalls.push({ accessJwt, blob, mimeType });
      const response = this.uploadBlobResponses.shift();
      if (!response) {
        throw new Error('No uploadBlob response configured');
      }
      return response;
    }
  }

  it('requests the timeline with default limit and labeler headers', async () => {
    const feeds = new TestFeeds();
    const feedResponse = { feed: [] } as unknown as BlueskyFeedResponse;
    feeds.responses = [feedResponse];

    const result = await feeds.getTimeline('jwt');

    expect(result).toBe(feedResponse);
    expect(feeds.authCalls).toHaveLength(1);
    const call = feeds.authCalls[0];
    expect(call).toMatchObject({
      endpoint: '/app.bsky.feed.getTimeline',
      accessJwt: 'jwt',
      options: { params: { limit: '20' } },
    });
    expect(call.options.headers?.['atproto-accept-labelers']).toContain(
      'did:plc:ar7c4by46qjdydhdevvrndac;redact',
    );
  });

  it('fetches trending topics without authentication', async () => {
    const feeds = new TestFeeds();
    const topicsResponse = { topics: [] } as unknown as BlueskyTrendingTopicsResponse;
    feeds.responses = [topicsResponse];

    const result = await feeds.getTrendingTopics();

    expect(result).toBe(topicsResponse);
    expect(feeds.requestCalls).toEqual([
      {
        endpoint: '/app.bsky.unspecced.getTrendingTopics',
        options: { params: { limit: '10' } },
      },
    ]);
  });

  it('loads actor feeds with pagination cursor', async () => {
    const feeds = new TestFeeds();
    const response = { feeds: [] } as unknown as BlueskyFeedsResponse;
    feeds.responses = [response];

    const result = await feeds.getFeeds('jwt', 'did:example:alice', 25, 'cursor-123');

    expect(result).toBe(response);
    expect(feeds.authCalls[0]).toEqual({
      endpoint: '/app.bsky.feed.getActorFeeds',
      accessJwt: 'jwt',
      options: {
        params: {
          actor: 'did:example:alice',
          limit: '25',
          cursor: 'cursor-123',
        },
      },
    });
  });

  it('requests posts from a feed generator', async () => {
    const feeds = new TestFeeds();
    const response = { feed: [] } as unknown as BlueskyFeedResponse;
    feeds.responses = [response];

    const result = await feeds.getFeed('jwt', 'at://feed/123', 30);

    expect(result).toBe(response);
    expect(feeds.authCalls[0]).toEqual({
      endpoint: '/app.bsky.feed.getFeed',
      accessJwt: 'jwt',
      options: {
        params: {
          feed: 'at://feed/123',
          limit: '30',
        },
      },
    });
  });

  it('fetches feed generator metadata', async () => {
    const feeds = new TestFeeds();
    const response = { feeds: [] } as unknown as BlueskyFeedGeneratorsResponse;
    feeds.responses = [response];

    const result = await feeds.getFeedGenerators('jwt', ['at://feed/a', 'at://feed/b']);

    expect(result).toBe(response);
    expect(feeds.authCalls[0]).toEqual({
      endpoint: '/app.bsky.feed.getFeedGenerators',
      accessJwt: 'jwt',
      options: {
        params: {
          feeds: ['at://feed/a', 'at://feed/b'],
        },
      },
    });
  });

  it('lists bookmarks and forwards the cursor parameter when provided', async () => {
    const feeds = new TestFeeds();
    const response = { bookmarks: [] } as unknown as BlueskyBookmarksResponse;
    feeds.responses = [response];

    const result = await feeds.getBookmarks('jwt', 40, 'cursor-abc');

    expect(result).toBe(response);
    expect(feeds.authCalls[0]).toEqual({
      endpoint: '/app.bsky.bookmark.getBookmarks',
      accessJwt: 'jwt',
      options: {
        params: {
          limit: '40',
          cursor: 'cursor-abc',
        },
      },
    });
  });

  it('returns a post from getPost when the thread is present', async () => {
    const feeds = new TestFeeds();
    const post = { uri: 'at://post/1' } as unknown as BlueskyPostView;
    feeds.responses = [
      {
        thread: { post },
      },
    ];

    const result = await feeds.getPost('jwt', 'at://post/1');

    expect(result).toBe(post);
    expect(feeds.authCalls[0]).toMatchObject({
      endpoint: '/app.bsky.feed.getPostThread',
      accessJwt: 'jwt',
      options: { params: { uri: 'at://post/1' } },
    });
  });

  it('throws an error when getPost cannot find the post in the thread', async () => {
    const feeds = new TestFeeds();
    feeds.responses = [{}];

    await expect(feeds.getPost('jwt', 'at://post/2')).rejects.toThrow('Post not found');
  });

  it('retrieves a thread without extra processing', async () => {
    const feeds = new TestFeeds();
    const threadResponse = { thread: {} } as unknown as BlueskyThreadResponse;
    feeds.responses = [threadResponse];

    const result = await feeds.getPostThread('jwt', 'at://post/3');

    expect(result).toBe(threadResponse);
    expect(feeds.authCalls[0]).toEqual({
      endpoint: '/app.bsky.feed.getPostThread',
      accessJwt: 'jwt',
      options: { params: { uri: 'at://post/3' } },
    });
  });

  it('requests the author feed with filter and cursor', async () => {
    const feeds = new TestFeeds();
    const response = { feed: [] } as unknown as BlueskyFeedResponse;
    feeds.responses = [response];

    const result = await feeds.getAuthorFeed(
      'jwt',
      'did:example:alice',
      10,
      'cursor-1',
      'posts_with_media',
    );

    expect(result).toBe(response);
    expect(feeds.authCalls[0]).toEqual({
      endpoint: '/app.bsky.feed.getAuthorFeed',
      accessJwt: 'jwt',
      options: {
        params: {
          actor: 'did:example:alice',
          limit: '10',
          cursor: 'cursor-1',
          filter: 'posts_with_media',
        },
      },
    });
  });

  it('requests the author video feed and forces the video filter', async () => {
    const feeds = new TestFeeds();
    const response = { feed: [] } as unknown as BlueskyFeedResponse;
    feeds.responses = [response];

    const result = await feeds.getAuthorVideos('jwt', 'did:example:bob', 5, 'cursor-2');

    expect(result).toBe(response);
    expect(feeds.authCalls[0]).toEqual({
      endpoint: '/app.bsky.feed.getAuthorFeed',
      accessJwt: 'jwt',
      options: {
        params: {
          actor: 'did:example:bob',
          limit: '5',
          cursor: 'cursor-2',
          filter: 'posts_with_video',
        },
      },
    });
  });

  it('requests author feeds and starterpacks', async () => {
    const feeds = new TestFeeds();
    const feedResponse = { feeds: [] } as unknown as BlueskyFeedsResponse;
    const starterpacksResponse = {
      starterPacks: [],
    } as unknown as BlueskyStarterPacksResponse;
    feeds.responses = [feedResponse, starterpacksResponse];

    const feedsResult = await feeds.getAuthorFeeds('jwt', 'did:example:carol', 15);
    const starterpacksResult = await feeds.getAuthorStarterpacks('jwt', 'did:example:carol', 15);

    expect(feedsResult).toBe(feedResponse);
    expect(starterpacksResult).toBe(starterpacksResponse);
    expect(feeds.authCalls[0]).toEqual({
      endpoint: '/app.bsky.feed.getActorFeeds',
      accessJwt: 'jwt',
      options: { params: { actor: 'did:example:carol', limit: '15' } },
    });
    expect(feeds.authCalls[1]).toEqual({
      endpoint: '/app.bsky.graph.getActorStarterPacks',
      accessJwt: 'jwt',
      options: { params: { actor: 'did:example:carol', limit: '15' } },
    });
  });

  it('likes a post using the repo createRecord endpoint', async () => {
    const feeds = new TestFeeds();
    const response = { uri: 'at://like/1' } as unknown as BlueskyLikeResponse;
    feeds.responses = [response];

    const result = await feeds.likePost('jwt', 'at://post/5', 'cid123', 'did:example:me');

    expect(result).toBe(response);
    expect(feeds.authCalls[0].endpoint).toBe('/com.atproto.repo.createRecord');
    expect(feeds.authCalls[0].options.method).toBe('POST');
    expect(feeds.authCalls[0].options.body).toMatchObject({
      repo: 'did:example:me',
      collection: 'app.bsky.feed.like',
      record: {
        subject: { uri: 'at://post/5', cid: 'cid123' },
        $type: 'app.bsky.feed.like',
      },
    });
    const createdAt = (feeds.authCalls[0].options.body as Record<string, unknown>).record as Record<string, unknown>;
    expect(typeof createdAt.createdAt).toBe('string');
  });

  it('unlikes a post using the deleteRecord endpoint', async () => {
    const feeds = new TestFeeds();
    const response = { success: true } as unknown as BlueskyUnlikeResponse;
    feeds.responses = [response];

    const result = await feeds.unlikePost('jwt', 'at://did:example/app.bsky.feed.like/123', 'did:example:me');

    expect(result).toBe(response);
    expect(feeds.authCalls[0]).toEqual({
      endpoint: '/com.atproto.repo.deleteRecord',
      accessJwt: 'jwt',
      options: {
        method: 'POST',
        body: {
          collection: 'app.bsky.feed.like',
          repo: 'did:example:me',
          rkey: '123',
        },
      },
    });
  });

  it('throws an error when the like URI does not include an rkey', async () => {
    const feeds = new TestFeeds();

    await expect(feeds.unlikePost('jwt', 'at://did:example/', 'did:example:me')).rejects.toThrow(
      'Invalid like URI: could not extract rkey',
    );
    expect(feeds.authCalls).toHaveLength(0);
  });

  it('fetches an image and uploads it with the original mime type', async () => {
    const feeds = new TestFeeds();
    const imageBlob = new Blob(['image-data'], { type: 'image/png' });
    const uploadResponse: BlueskyUploadBlobResponse = {
      blob: { ref: { $link: 'blob/png' }, mimeType: 'image/png', size: 1234 },
    };
    feeds.uploadBlobResponses = [uploadResponse];
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      blob: async () => imageBlob,
    } as unknown as Response);

    const result = await feeds.uploadImage('jwt', 'file://image.png', 'image/png');

    expect(result).toBe(uploadResponse);
    expect(fetchSpy).toHaveBeenCalledWith('file://image.png');
    expect(feeds.uploadBlobCalls).toEqual([
      {
        accessJwt: 'jwt',
        blob: imageBlob,
        mimeType: 'image/png',
      },
    ]);

    fetchSpy.mockRestore();
  });

  it('preserves gif mime type when uploading gif images', async () => {
    const feeds = new TestFeeds();
    const gifBlob = new Blob(['gif-data'], { type: 'image/gif' });
    const uploadResponse: BlueskyUploadBlobResponse = {
      blob: { ref: { $link: 'blob/gif' }, mimeType: 'image/gif', size: 4321 },
    };
    feeds.uploadBlobResponses = [uploadResponse];
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      blob: async () => gifBlob,
    } as unknown as Response);

    await feeds.uploadImage('jwt', 'file://image.gif', 'image/gif');

    expect(feeds.uploadBlobCalls).toEqual([
      {
        accessJwt: 'jwt',
        blob: gifBlob,
        mimeType: 'image/gif',
      },
    ]);

    fetchSpy.mockRestore();
  });

  it('creates a post with text only and default metadata', async () => {
    const feeds = new TestFeeds();
    const response = {
      uri: 'at://post/created',
      cid: 'cid123',
      commit: { cid: 'cid123', rev: 'rev1' },
      validationStatus: 'valid',
    } as BlueskyCreatePostResponse;
    feeds.responses = [response];

    const result = await feeds.createPost('jwt', 'did:example:me', { text: 'Hello world' });

    expect(result).toBe(response);
    expect(feeds.authCalls).toHaveLength(1);
    const body = feeds.authCalls[0].options.body as { record: Record<string, unknown> };
    expect(body.record).toMatchObject({
      text: 'Hello world',
      $type: 'app.bsky.feed.post',
      langs: ['en'],
    });
    expect(typeof body.record.createdAt).toBe('string');
    expect(body.record).not.toHaveProperty('embed');
    expect(body.record).not.toHaveProperty('reply');
  });

  it('creates a post with reply context and image embeds', async () => {
    const feeds = new TestFeeds();
    const response = {
      uri: 'at://post/with-images',
      cid: 'cid456',
      commit: { cid: 'cid456', rev: 'rev2' },
      validationStatus: 'valid',
    } as BlueskyCreatePostResponse;
    feeds.responses = [response];
    const uploadResult: BlueskyUploadBlobResponse = {
      blob: { ref: { $link: 'blob/image' }, mimeType: 'image/png', size: 2048 },
    };
    const uploadImageSpy = jest
      .spyOn(feeds, 'uploadImage')
      .mockResolvedValue(uploadResult);

    const result = await feeds.createPost('jwt', 'did:example:me', {
      text: 'Check this out',
      replyTo: { root: 'at://root', parent: 'at://parent' },
      images: [
        {
          uri: 'file://image.png',
          mimeType: 'image/png',
          alt: 'A cool image',
        },
      ],
    });

    expect(result).toBe(response);
    expect(uploadImageSpy).toHaveBeenCalledWith('jwt', 'file://image.png', 'image/png');
    const body = feeds.authCalls[0].options.body as { record: Record<string, unknown> };
    expect(body.record.reply).toEqual({ root: 'at://root', parent: 'at://parent' });
    expect(body.record.embed).toEqual({
      $type: 'app.bsky.embed.images',
      images: [
        {
          alt: 'A cool image',
          image: uploadResult.blob,
        },
      ],
    });

    uploadImageSpy.mockRestore();
  });

  it('creates a post with a gif as an external embed and jpeg thumbnail', async () => {
    const feeds = new TestFeeds();
    const response = {
      uri: 'at://post/with-gif',
      cid: 'cid789',
      commit: { cid: 'cid789', rev: 'rev3' },
      validationStatus: 'valid',
    } as BlueskyCreatePostResponse;
    feeds.responses = [response];
    const uploadResult: BlueskyUploadBlobResponse = {
      blob: { ref: { $link: 'blob/thumb' }, mimeType: 'image/jpeg', size: 1024 },
    };
    const uploadImageSpy = jest
      .spyOn(feeds, 'uploadImage')
      .mockResolvedValue(uploadResult);

    const result = await feeds.createPost('jwt', 'did:example:me', {
      text: 'A fun gif',
      images: [
        {
          uri: 'file://image.gif',
          mimeType: 'image/gif',
          alt: 'Fun gif',
        },
      ],
    });

    expect(result).toBe(response);
    expect(uploadImageSpy).toHaveBeenCalledWith('jwt', 'file://image.gif', 'image/jpeg');
    const body = feeds.authCalls[0].options.body as { record: Record<string, unknown> };
    expect(body.record.embed).toEqual({
      $type: 'app.bsky.embed.external',
      external: {
        uri: 'file://image.gif',
        title: 'Fun gif',
        description: 'Alt: Fun gif',
        thumb: {
          $type: 'blob',
          ref: uploadResult.blob.ref,
          mimeType: uploadResult.blob.mimeType,
          size: uploadResult.blob.size,
        },
      },
    });

    uploadImageSpy.mockRestore();
  });
});
