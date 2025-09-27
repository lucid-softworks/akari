import { BlueskyFeeds } from './feeds';
import type {
  BlueskyBookmarksResponse,
  BlueskyFeedGeneratorsResponse,
  BlueskyFeedResponse,
  BlueskyFeedsResponse,
  BlueskyLikeResponse,
  BlueskyPostView,
  BlueskyStarterPacksResponse,
  BlueskyThreadResponse,
  BlueskyTrendingTopicsResponse,
  BlueskyUnlikeResponse,
} from './types';

describe('BlueskyFeeds', () => {
  class TestFeeds extends BlueskyFeeds {
    public authCalls: {
      endpoint: string;
      accessJwt: string;
      options: {
        method?: 'GET' | 'POST';
        body?: Record<string, unknown> | FormData | Blob;
        queryParameters?: Record<string, string>;
        headers?: Record<string, string>;
      };
    }[] = [];

    public requestCalls: {
      endpoint: string;
      options: {
        method?: 'GET' | 'POST';
        body?: Record<string, unknown> | FormData | Blob;
        queryParameters?: Record<string, string>;
        headers?: Record<string, string>;
      };
    }[] = [];

    public responses: unknown[] = [];

    constructor() {
      super('https://pds.example');
    }

    protected async makeAuthenticatedRequest<T>(
      endpoint: string,
      accessJwt: string,
      options: {
        method?: 'GET' | 'POST';
        body?: Record<string, unknown> | FormData | Blob;
        queryParameters?: Record<string, string>;
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
        queryParameters?: Record<string, string>;
        headers?: Record<string, string>;
      } = {},
    ): Promise<T> {
      this.requestCalls.push({ endpoint, options });
      return (this.responses.shift() as T) ?? (undefined as T);
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
      options: { queryParameters: { limit: '20' } },
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
        options: { queryParameters: { limit: '10' } },
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
        queryParameters: {
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
        queryParameters: {
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
        queryParameters: {
          feeds: 'at://feed/a,at://feed/b',
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
        queryParameters: {
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
      options: { queryParameters: { uri: 'at://post/1' } },
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
      options: { queryParameters: { uri: 'at://post/3' } },
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
        queryParameters: {
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
        queryParameters: {
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
      options: { queryParameters: { actor: 'did:example:carol', limit: '15' } },
    });
    expect(feeds.authCalls[1]).toEqual({
      endpoint: '/app.bsky.graph.getActorStarterPacks',
      accessJwt: 'jwt',
      options: { queryParameters: { actor: 'did:example:carol', limit: '15' } },
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
});
