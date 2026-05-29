import { BlueskyApi } from './api';
import type { AiPreferencesRecord } from './repos';
import type {
  BlueskyBookmarksResponse,
  BlueskyConvosResponse,
  BlueskyCreatePostInput,
  BlueskyCreatePostResponse,
  BlueskyFeedGeneratorsResponse,
  BlueskyFeedResponse,
  BlueskyFeedsResponse,
  BlueskyLinkatBoardResponse,
  BlueskyMessagesResponse,
  BlueskyNotificationsResponse,
  BlueskyPostView,
  BlueskySearchActorsResponse,
  BlueskySearchPostsResponse,
  BlueskySendMessageInput,
  BlueskySendMessageResponse,
  BlueskyStarterPacksResponse,
  BlueskyThreadResponse,
  BlueskyTrendingTopicsResponse,
  BlueskyUnreadNotificationCount,
  BlueskyUploadBlobResponse,
  CreateReviewInput,
} from './types';

const LABELER_HEADER = 'did:plc:ar7c4by46qjdydhdevvrndac;redact';

type RequestOptions = {
  method?: 'GET' | 'POST';
  body?: Record<string, unknown> | FormData | Blob;
  params?: Record<string, string | string[]>;
  headers?: Record<string, string>;
};

type AuthCall = { endpoint: string; accessJwt: string; options: RequestOptions };
type RequestCall = { endpoint: string; options: RequestOptions };
type UploadBlobCall = { accessJwt: string; blob: Blob; mimeType: string };

/**
 * The BlueskyApi facade delegates every method to a private sub-module
 * instance (this.feeds, this.graph, ...). Each of those sub-modules has its
 * own copy of the protected request helpers inherited from BlueskyApiClient.
 * To capture the real endpoint/params/body produced by the sub-module logic,
 * we replace each sub-module instance's protected helpers with capturing
 * functions that share a single response queue and call log.
 */
class TestApi extends BlueskyApi {
  public authCalls: AuthCall[] = [];
  public requestCalls: RequestCall[] = [];
  public uploadBlobCalls: UploadBlobCall[] = [];
  public responses: unknown[] = [];
  public uploadBlobResponses: BlueskyUploadBlobResponse[] = [];

  constructor() {
    super('https://pds.example');

    const submoduleNames = [
      'actors',
      'auth',
      'conversations',
      'drafts',
      'feeds',
      'graph',
      'grain',
      'flashes',
      'spark',
      'poll',
      'leaflet',
      'notifications',
      'search',
      'repos',
      'rpg',
      'sifa',
    ];

    const self = this;
    const store = this as unknown as Record<string, Record<string, unknown>>;

    for (const name of submoduleNames) {
      const submodule = store[name];
      if (!submodule) continue;

      submodule.makeAuthenticatedRequest = async function <T>(
        endpoint: string,
        accessJwt: string,
        options: RequestOptions = {},
      ): Promise<T> {
        self.authCalls.push({ endpoint, accessJwt, options });
        return (self.responses.shift() as T) ?? (undefined as T);
      };

      submodule.makeRequest = async function <T>(
        endpoint: string,
        options: RequestOptions = {},
      ): Promise<T> {
        self.requestCalls.push({ endpoint, options });
        return (self.responses.shift() as T) ?? (undefined as T);
      };

      submodule.uploadBlob = async function (
        accessJwt: string,
        blob: Blob,
        mimeType: string,
      ): Promise<BlueskyUploadBlobResponse> {
        self.uploadBlobCalls.push({ accessJwt, blob, mimeType });
        const response = self.uploadBlobResponses.shift();
        if (!response) {
          throw new Error('No uploadBlob response configured');
        }
        return response;
      };
    }
  }
}

describe('BlueskyApi facade (part 2)', () => {
  describe('repos / linkat / reviews / ai preferences', () => {
    it('getActorLinkatBoards forwards repo/collection/limit and a cursor', async () => {
      const api = new TestApi();
      const response = { records: [] } as unknown as BlueskyLinkatBoardResponse;
      api.responses = [response];

      const result = await api.getActorLinkatBoards('jwt', 'did:example:alice', 30, 'cursor-1');

      expect(result).toBe(response);
      expect(api.authCalls[0]).toEqual({
        endpoint: '/com.atproto.repo.listRecords',
        accessJwt: 'jwt',
        options: {
          params: {
            repo: 'did:example:alice',
            collection: 'blue.linkat.board',
            limit: '30',
            cursor: 'cursor-1',
          },
        },
      });
    });

    it('getActorLinkatBoards uses the default limit and omits cursor', async () => {
      const api = new TestApi();
      api.responses = [{ records: [] }];

      await api.getActorLinkatBoards('jwt', 'did:example:bob');

      expect(api.authCalls[0].options.params).toEqual({
        repo: 'did:example:bob',
        collection: 'blue.linkat.board',
        limit: '50',
      });
    });

    it('getActorLinkatBoards swallows errors and returns an empty page', async () => {
      const api = new TestApi();
      const store = api as unknown as Record<string, Record<string, unknown>>;
      store.repos.makeAuthenticatedRequest = async () => {
        throw new Error('boom');
      };

      const result = await api.getActorLinkatBoards('jwt', 'did:example:carol');

      expect(result).toEqual({ records: [], cursor: undefined });
    });

    it('createReview builds the record with required and optional fields', async () => {
      const api = new TestApi();
      const response = { uri: 'at://review/1' } as unknown as BlueskyCreatePostResponse;
      api.responses = [response];
      const review: CreateReviewInput = {
        identifiers: { tmdbId: '603' },
        creativeWorkType: 'movie',
        rating: 5,
        text: 'Great film',
        title: 'The Matrix',
        tags: ['scifi'],
      };

      const result = await api.createReview('jwt', 'did:example:me', review);

      expect(result).toBe(response);
      const call = api.authCalls[0];
      expect(call.endpoint).toBe('/com.atproto.repo.createRecord');
      expect(call.options.method).toBe('POST');
      const body = call.options.body as { repo: string; collection: string; record: Record<string, unknown> };
      expect(body.repo).toBe('did:example:me');
      expect(body.collection).toBe('social.popfeed.feed.review');
      expect(body.record).toMatchObject({
        $type: 'social.popfeed.feed.review',
        identifiers: { tmdbId: '603' },
        creativeWorkType: 'movie',
        rating: 5,
        text: 'Great film',
        title: 'The Matrix',
        tags: ['scifi'],
      });
      expect(typeof body.record.createdAt).toBe('string');
      expect(body.record).not.toHaveProperty('genres');
    });

    it('getAiPreferences unwraps the record value', async () => {
      const api = new TestApi();
      const record: AiPreferencesRecord = {
        $type: 'community.lexicon.preference.ai',
        preferences: {
          embedding: { allow: true, updatedAt: 'now' },
          inference: { allow: false, updatedAt: 'now' },
          syntheticContent: { allow: false, updatedAt: 'now' },
          training: { allow: true, updatedAt: 'now' },
        },
        scope: { $type: 'community.lexicon.preference.ai#globalScope' },
        updatedAt: 'now',
      };
      api.responses = [{ uri: 'at://ai/1', cid: 'cid', value: record }];

      const result = await api.getAiPreferences('jwt', 'did:example:me');

      expect(result).toBe(record);
      expect(api.authCalls[0]).toEqual({
        endpoint: '/com.atproto.repo.getRecord',
        accessJwt: 'jwt',
        options: {
          params: {
            repo: 'did:example:me',
            collection: 'community.lexicon.preference.ai',
            rkey: 'self',
          },
        },
      });
    });

    it('getAiPreferences returns null when the record is missing', async () => {
      const api = new TestApi();
      const store = api as unknown as Record<string, Record<string, unknown>>;
      store.repos.makeAuthenticatedRequest = async () => {
        throw { errorCode: 'RecordNotFound' };
      };

      await expect(api.getAiPreferences('jwt', 'did:example:me')).resolves.toBeNull();
    });

    it('putAiPreferences writes the record at rkey self', async () => {
      const api = new TestApi();
      const record: AiPreferencesRecord = {
        $type: 'community.lexicon.preference.ai',
        preferences: {
          embedding: { allow: true, updatedAt: 'now' },
          inference: { allow: true, updatedAt: 'now' },
          syntheticContent: { allow: true, updatedAt: 'now' },
          training: { allow: true, updatedAt: 'now' },
        },
        scope: { $type: 'community.lexicon.preference.ai#globalScope' },
        updatedAt: 'now',
      };
      api.responses = [{ uri: 'at://ai/1', cid: 'cid' }];

      await api.putAiPreferences('jwt', 'did:example:me', record);

      expect(api.authCalls[0]).toEqual({
        endpoint: '/com.atproto.repo.putRecord',
        accessJwt: 'jwt',
        options: {
          method: 'POST',
          body: {
            repo: 'did:example:me',
            collection: 'community.lexicon.preference.ai',
            rkey: 'self',
            record,
          },
        },
      });
    });
  });

  describe('feeds', () => {
    it('getTimeline defaults to limit 20 with the baseline labeler header', async () => {
      const api = new TestApi();
      const response = { feed: [] } as unknown as BlueskyFeedResponse;
      api.responses = [response];

      const result = await api.getTimeline('jwt');

      expect(result).toBe(response);
      const call = api.authCalls[0];
      expect(call.endpoint).toBe('/app.bsky.feed.getTimeline');
      expect(call.accessJwt).toBe('jwt');
      expect(call.options.params).toEqual({ limit: '20' });
      expect(call.options.headers?.['atproto-accept-labelers']).toBe(LABELER_HEADER);
    });

    it('getTrendingTopics is unauthenticated and honours a custom limit', async () => {
      const api = new TestApi();
      const response = { topics: [] } as unknown as BlueskyTrendingTopicsResponse;
      api.responses = [response];

      const result = await api.getTrendingTopics(5);

      expect(result).toBe(response);
      expect(api.authCalls).toHaveLength(0);
      expect(api.requestCalls[0]).toEqual({
        endpoint: '/app.bsky.unspecced.getTrendingTopics',
        options: { params: { limit: '5' } },
      });
    });

    it('getFeeds forwards actor/limit and an optional cursor', async () => {
      const api = new TestApi();
      const response = { feeds: [] } as unknown as BlueskyFeedsResponse;
      api.responses = [response];

      const result = await api.getFeeds('jwt', 'did:example:alice', 25, 'cursor-1');

      expect(result).toBe(response);
      expect(api.authCalls[0]).toEqual({
        endpoint: '/app.bsky.feed.getActorFeeds',
        accessJwt: 'jwt',
        options: { params: { actor: 'did:example:alice', limit: '25', cursor: 'cursor-1' } },
      });
    });

    it('getFeed targets the feed generator with the labeler header', async () => {
      const api = new TestApi();
      const response = { feed: [] } as unknown as BlueskyFeedResponse;
      api.responses = [response];

      const result = await api.getFeed('jwt', 'at://feed/1', 30);

      expect(result).toBe(response);
      const call = api.authCalls[0];
      expect(call.endpoint).toBe('/app.bsky.feed.getFeed');
      expect(call.options.params).toEqual({ feed: 'at://feed/1', limit: '30' });
      expect(call.options.headers?.['atproto-accept-labelers']).toBe(LABELER_HEADER);
    });

    it('getFeedGenerators forwards the feeds array', async () => {
      const api = new TestApi();
      const response = { feeds: [] } as unknown as BlueskyFeedGeneratorsResponse;
      api.responses = [response];

      const result = await api.getFeedGenerators('jwt', ['at://feed/a', 'at://feed/b']);

      expect(result).toBe(response);
      expect(api.authCalls[0]).toEqual({
        endpoint: '/app.bsky.feed.getFeedGenerators',
        accessJwt: 'jwt',
        options: { params: { feeds: ['at://feed/a', 'at://feed/b'] } },
      });
    });

    it('getBookmarks forwards limit/cursor and the labeler header', async () => {
      const api = new TestApi();
      const response = { bookmarks: [] } as unknown as BlueskyBookmarksResponse;
      api.responses = [response];

      const result = await api.getBookmarks('jwt', 40, 'cursor-1');

      expect(result).toBe(response);
      const call = api.authCalls[0];
      expect(call.endpoint).toBe('/app.bsky.bookmark.getBookmarks');
      expect(call.options.params).toEqual({ limit: '40', cursor: 'cursor-1' });
      expect(call.options.headers?.['atproto-accept-labelers']).toBe(LABELER_HEADER);
    });

    it('createBookmark posts a flat {uri, cid} body', async () => {
      const api = new TestApi();
      api.responses = [undefined];

      await api.createBookmark('jwt', 'at://post/1', 'cid1');

      expect(api.authCalls[0]).toEqual({
        endpoint: '/app.bsky.bookmark.createBookmark',
        accessJwt: 'jwt',
        options: { method: 'POST', body: { uri: 'at://post/1', cid: 'cid1' } },
      });
    });

    it('deleteBookmark posts only the uri', async () => {
      const api = new TestApi();
      api.responses = [undefined];

      await api.deleteBookmark('jwt', 'at://post/1');

      expect(api.authCalls[0]).toEqual({
        endpoint: '/app.bsky.bookmark.deleteBookmark',
        accessJwt: 'jwt',
        options: { method: 'POST', body: { uri: 'at://post/1' } },
      });
    });

    it('getPost extracts the post from the thread', async () => {
      const api = new TestApi();
      const post = { uri: 'at://post/1' } as unknown as BlueskyPostView;
      api.responses = [{ thread: { post } }];

      const result = await api.getPost('jwt', 'at://post/1');

      expect(result).toBe(post);
      expect(api.authCalls[0].endpoint).toBe('/app.bsky.feed.getPostThread');
      expect(api.authCalls[0].options.params).toEqual({ uri: 'at://post/1' });
    });

    it('getPosts forwards the (capped) uri list with the labeler header', async () => {
      const api = new TestApi();
      const response = { posts: [] };
      api.responses = [response];

      const result = await api.getPosts('jwt', ['at://post/1', 'at://post/2']);

      expect(result).toBe(response);
      const call = api.authCalls[0];
      expect(call.endpoint).toBe('/app.bsky.feed.getPosts');
      expect(call.options.params).toEqual({ uris: ['at://post/1', 'at://post/2'] });
      expect(call.options.headers?.['atproto-accept-labelers']).toBe(LABELER_HEADER);
    });

    it('getPosts short-circuits to an empty page for an empty uri list', async () => {
      const api = new TestApi();

      const result = await api.getPosts('jwt', []);

      expect(result).toEqual({ posts: [] });
      expect(api.authCalls).toHaveLength(0);
    });

    it('getPostThread fetches the full thread', async () => {
      const api = new TestApi();
      const response = { thread: {} } as unknown as BlueskyThreadResponse;
      api.responses = [response];

      const result = await api.getPostThread('jwt', 'at://post/1');

      expect(result).toBe(response);
      expect(api.authCalls[0].endpoint).toBe('/app.bsky.feed.getPostThread');
      expect(api.authCalls[0].options.params).toEqual({ uri: 'at://post/1' });
    });

    it('getAuthorFeed forwards actor/limit/cursor/filter', async () => {
      const api = new TestApi();
      const response = { feed: [] } as unknown as BlueskyFeedResponse;
      api.responses = [response];

      const result = await api.getAuthorFeed('jwt', 'did:example:alice', 10, 'cursor-1', 'posts_with_media');

      expect(result).toBe(response);
      const call = api.authCalls[0];
      expect(call.endpoint).toBe('/app.bsky.feed.getAuthorFeed');
      expect(call.options.params).toEqual({
        actor: 'did:example:alice',
        limit: '10',
        cursor: 'cursor-1',
        filter: 'posts_with_media',
      });
    });

    it('getAuthorVideos forces the video filter', async () => {
      const api = new TestApi();
      const response = { feed: [] } as unknown as BlueskyFeedResponse;
      api.responses = [response];

      const result = await api.getAuthorVideos('jwt', 'did:example:bob', 5);

      expect(result).toBe(response);
      const call = api.authCalls[0];
      expect(call.endpoint).toBe('/app.bsky.feed.getAuthorFeed');
      expect(call.options.params).toMatchObject({
        actor: 'did:example:bob',
        limit: '5',
        filter: 'posts_with_video',
      });
    });

    it('getAuthorFeeds lists actor feeds', async () => {
      const api = new TestApi();
      const response = { feeds: [] } as unknown as BlueskyFeedsResponse;
      api.responses = [response];

      const result = await api.getAuthorFeeds('jwt', 'did:example:carol', 15);

      expect(result).toBe(response);
      expect(api.authCalls[0]).toEqual({
        endpoint: '/app.bsky.feed.getActorFeeds',
        accessJwt: 'jwt',
        options: { params: { actor: 'did:example:carol', limit: '15' } },
      });
    });

    it('getAuthorStarterpacks lists starter packs', async () => {
      const api = new TestApi();
      const response = { starterPacks: [] } as unknown as BlueskyStarterPacksResponse;
      api.responses = [response];

      const result = await api.getAuthorStarterpacks('jwt', 'did:example:carol', 15);

      expect(result).toBe(response);
      expect(api.authCalls[0]).toEqual({
        endpoint: '/app.bsky.graph.getActorStarterPacks',
        accessJwt: 'jwt',
        options: { params: { actor: 'did:example:carol', limit: '15' } },
      });
    });

    it('createPost builds a text-only record with default langs', async () => {
      const api = new TestApi();
      const response = { uri: 'at://post/created' } as unknown as BlueskyCreatePostResponse;
      api.responses = [response];
      const input: BlueskyCreatePostInput = { text: 'Hello world' };

      const result = await api.createPost('jwt', 'did:example:me', input);

      expect(result).toBe(response);
      const body = api.authCalls[0].options.body as { record: Record<string, unknown> };
      expect(body.record).toMatchObject({
        text: 'Hello world',
        $type: 'app.bsky.feed.post',
        langs: ['en'],
      });
    });

    it('setThreadgate writes a nobody record with an empty allow list', async () => {
      const api = new TestApi();
      api.responses = [{ uri: 'at://gate/1' }];

      await api.setThreadgate('jwt', 'did:example:me', 'at://did:example:me/app.bsky.feed.post/abc', {
        type: 'nobody',
      });

      const call = api.authCalls[0];
      expect(call.endpoint).toBe('/com.atproto.repo.putRecord');
      const body = call.options.body as { repo: string; collection: string; rkey: string; record: Record<string, unknown> };
      expect(body.repo).toBe('did:example:me');
      expect(body.collection).toBe('app.bsky.feed.threadgate');
      expect(body.rkey).toBe('abc');
      expect(body.record.allow).toEqual([]);
    });

    it('setThreadgate maps limited rules to lexicon rule objects', async () => {
      const api = new TestApi();
      api.responses = [{ uri: 'at://gate/1' }];

      await api.setThreadgate('jwt', 'did:example:me', 'at://did:example:me/app.bsky.feed.post/abc', {
        type: 'limited',
        mention: true,
        following: true,
        listUris: ['at://list/1'],
      });

      const body = api.authCalls[0].options.body as { record: Record<string, unknown> };
      expect(body.record.allow).toEqual([
        { $type: 'app.bsky.feed.threadgate#mentionRule' },
        { $type: 'app.bsky.feed.threadgate#followingRule' },
        { $type: 'app.bsky.feed.threadgate#listRule', list: 'at://list/1' },
      ]);
    });

    it('setPostgate disables quotes when allowQuote is false', async () => {
      const api = new TestApi();
      api.responses = [{ uri: 'at://postgate/1' }];

      await api.setPostgate('jwt', 'did:example:me', 'at://did:example:me/app.bsky.feed.post/abc', {
        allowQuote: false,
      });

      const call = api.authCalls[0];
      expect(call.endpoint).toBe('/com.atproto.repo.putRecord');
      const body = call.options.body as { collection: string; rkey: string; record: Record<string, unknown> };
      expect(body.collection).toBe('app.bsky.feed.postgate');
      expect(body.rkey).toBe('abc');
      expect(body.record.embeddingRules).toEqual([{ $type: 'app.bsky.feed.postgate#disableRule' }]);
    });

    it('setPostgate leaves quotes enabled with an empty rule list', async () => {
      const api = new TestApi();
      api.responses = [{ uri: 'at://postgate/1' }];

      await api.setPostgate('jwt', 'did:example:me', 'at://did:example:me/app.bsky.feed.post/abc', {
        allowQuote: true,
      });

      const body = api.authCalls[0].options.body as { record: Record<string, unknown> };
      expect(body.record.embeddingRules).toEqual([]);
    });

    it('uploadImage fetches the URI then uploads the blob with its mime type', async () => {
      const api = new TestApi();
      const imageBlob = new Blob(['image-data'], { type: 'image/png' });
      const uploadResponse: BlueskyUploadBlobResponse = {
        blob: { ref: { $link: 'blob/png' }, mimeType: 'image/png', size: 1234 },
      };
      api.uploadBlobResponses = [uploadResponse];
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
        blob: async () => imageBlob,
      } as unknown as Response);

      const result = await api.uploadImage('jwt', 'file://image.png', 'image/png');

      expect(result).toBe(uploadResponse);
      expect(fetchSpy).toHaveBeenCalledWith('file://image.png');
      expect(api.uploadBlobCalls).toEqual([{ accessJwt: 'jwt', blob: imageBlob, mimeType: 'image/png' }]);

      fetchSpy.mockRestore();
    });

    it('likePost creates a like record', async () => {
      const api = new TestApi();
      api.responses = [{ uri: 'at://like/1' }];

      const result = await api.likePost('jwt', 'at://post/5', 'cid123', 'did:example:me');

      expect(result).toEqual({ uri: 'at://like/1' });
      const call = api.authCalls[0];
      expect(call.endpoint).toBe('/com.atproto.repo.createRecord');
      expect(call.options.body).toMatchObject({
        repo: 'did:example:me',
        collection: 'app.bsky.feed.like',
        record: { subject: { uri: 'at://post/5', cid: 'cid123' }, $type: 'app.bsky.feed.like' },
      });
    });

    it('unlikePost deletes the like record by rkey', async () => {
      const api = new TestApi();
      api.responses = [{ success: true }];

      await api.unlikePost('jwt', 'at://did:example:me/app.bsky.feed.like/123', 'did:example:me');

      expect(api.authCalls[0]).toEqual({
        endpoint: '/com.atproto.repo.deleteRecord',
        accessJwt: 'jwt',
        options: {
          method: 'POST',
          body: { collection: 'app.bsky.feed.like', repo: 'did:example:me', rkey: '123' },
        },
      });
    });

    it('repostPost creates a repost record', async () => {
      const api = new TestApi();
      api.responses = [{ uri: 'at://repost/1' }];

      await api.repostPost('jwt', 'at://post/5', 'cid123', 'did:example:me');

      const call = api.authCalls[0];
      expect(call.endpoint).toBe('/com.atproto.repo.createRecord');
      expect(call.options.body).toMatchObject({
        repo: 'did:example:me',
        collection: 'app.bsky.feed.repost',
        record: { subject: { uri: 'at://post/5', cid: 'cid123' }, $type: 'app.bsky.feed.repost' },
      });
    });

    it('unrepostPost deletes the repost record by rkey', async () => {
      const api = new TestApi();
      api.responses = [{ success: true }];

      await api.unrepostPost('jwt', 'at://did:example:me/app.bsky.feed.repost/999', 'did:example:me');

      expect(api.authCalls[0]).toEqual({
        endpoint: '/com.atproto.repo.deleteRecord',
        accessJwt: 'jwt',
        options: {
          method: 'POST',
          body: { collection: 'app.bsky.feed.repost', repo: 'did:example:me', rkey: '999' },
        },
      });
    });

    it('unrepostPost throws when the repost URI has no rkey', async () => {
      const api = new TestApi();

      await expect(api.unrepostPost('jwt', '', 'did:example:me')).rejects.toThrow(
        'Invalid repost URI: could not extract rkey',
      );
    });

    it('createReport reports an account via repoRef', async () => {
      const api = new TestApi();
      api.responses = [{ id: 1 }];

      await api.createReport('jwt', { did: 'did:example:bad' }, 'spam', 'because');

      const call = api.authCalls[0];
      expect(call.endpoint).toBe('/com.atproto.moderation.createReport');
      expect(call.options.body).toEqual({
        reasonType: 'com.atproto.moderation.defs#spam',
        reason: 'because',
        subject: { $type: 'com.atproto.admin.defs#repoRef', did: 'did:example:bad' },
      });
      expect(call.options.headers).toBeUndefined();
    });

    it('createReport reports a post via strongRef and routes to a labeler', async () => {
      const api = new TestApi();
      api.responses = [{ id: 2 }];

      await api.createReport('jwt', { uri: 'at://post/1', cid: 'cid1' }, 'violation', undefined, 'did:example:labeler');

      const call = api.authCalls[0];
      expect(call.options.body).toMatchObject({
        reasonType: 'com.atproto.moderation.defs#violation',
        subject: { $type: 'com.atproto.repo.strongRef', uri: 'at://post/1', cid: 'cid1' },
      });
      expect(call.options.headers).toEqual({ 'atproto-proxy': 'did:example:labeler#atproto_labeler' });
    });

    it('sendInteractions proxies events to the feed generator', async () => {
      const api = new TestApi();
      api.responses = [{}];
      const interactions = [{ event: 'app.bsky.feed.defs#requestMore', item: 'at://post/1' }];

      await api.sendInteractions('jwt', 'did:example:fg', interactions);

      expect(api.authCalls[0]).toEqual({
        endpoint: '/app.bsky.feed.sendInteractions',
        accessJwt: 'jwt',
        options: {
          method: 'POST',
          body: { interactions },
          headers: { 'atproto-proxy': 'did:example:fg#bsky_fg' },
        },
      });
    });
  });

  describe('conversations', () => {
    it('listConversations forwards limit and optional filters with the chat proxy', async () => {
      const api = new TestApi();
      const response = { convos: [] } as unknown as BlueskyConvosResponse;
      api.responses = [response];

      const result = await api.listConversations('jwt', 25, 'cursor-1', 'unread', 'accepted');

      expect(result).toBe(response);
      expect(api.authCalls[0]).toEqual({
        endpoint: '/chat.bsky.convo.listConvos',
        accessJwt: 'jwt',
        options: {
          params: { limit: '25', cursor: 'cursor-1', readState: 'unread', status: 'accepted' },
          headers: { 'atproto-proxy': 'did:web:api.bsky.chat#bsky_chat' },
        },
      });
    });

    it('getMessages forwards convoId and limit', async () => {
      const api = new TestApi();
      const response = { messages: [] } as unknown as BlueskyMessagesResponse;
      api.responses = [response];

      const result = await api.getMessages('jwt', 'convo-1', 10);

      expect(result).toBe(response);
      const call = api.authCalls[0];
      expect(call.endpoint).toBe('/chat.bsky.convo.getMessages');
      expect(call.options.params).toEqual({ convoId: 'convo-1', limit: '10' });
      expect(call.options.headers).toEqual({ 'atproto-proxy': 'did:web:api.bsky.chat#bsky_chat' });
    });

    it('sendMessage posts the message payload', async () => {
      const api = new TestApi();
      const response = { id: 'm1' } as unknown as BlueskySendMessageResponse;
      api.responses = [response];
      const message: BlueskySendMessageInput = { text: 'hi' };

      const result = await api.sendMessage('jwt', 'convo-1', message);

      expect(result).toBe(response);
      const call = api.authCalls[0];
      expect(call.endpoint).toBe('/chat.bsky.convo.sendMessage');
      expect(call.options.method).toBe('POST');
      expect(call.options.body).toEqual({ convoId: 'convo-1', message });
      expect(call.options.headers).toEqual({ 'atproto-proxy': 'did:web:api.bsky.chat#bsky_chat' });
    });

    it('markConversationRead posts updateRead', async () => {
      const api = new TestApi();
      api.responses = [undefined];

      await api.markConversationRead('jwt', 'convo-1');

      const call = api.authCalls[0];
      expect(call.endpoint).toBe('/chat.bsky.convo.updateRead');
      expect(call.options.method).toBe('POST');
      expect(call.options.body).toEqual({ convoId: 'convo-1' });
    });

    it('getConvoForMembers forwards the member DIDs', async () => {
      const api = new TestApi();
      api.responses = [{ convo: { id: 'c1' } }];

      await api.getConvoForMembers('jwt', ['did:example:a', 'did:example:b']);

      const call = api.authCalls[0];
      expect(call.endpoint).toBe('/chat.bsky.convo.getConvoForMembers');
      expect(call.options.params).toEqual({ members: ['did:example:a', 'did:example:b'] });
    });

    it('getConvo fetches a single convo by id', async () => {
      const api = new TestApi();
      api.responses = [{ convo: { id: 'c1' } }];

      await api.getConvo('jwt', 'c1');

      const call = api.authCalls[0];
      expect(call.endpoint).toBe('/chat.bsky.convo.getConvo');
      expect(call.options.params).toEqual({ convoId: 'c1' });
    });

    it('leaveConvo posts the convo id', async () => {
      const api = new TestApi();
      api.responses = [{}];

      await api.leaveConvo('jwt', 'c1');

      expect(api.authCalls[0]).toEqual({
        endpoint: '/chat.bsky.convo.leaveConvo',
        accessJwt: 'jwt',
        options: {
          method: 'POST',
          headers: { 'atproto-proxy': 'did:web:api.bsky.chat#bsky_chat' },
          body: { convoId: 'c1' },
        },
      });
    });

    it('addConvoMembers posts the dids', async () => {
      const api = new TestApi();
      api.responses = [{ convo: { id: 'c1' } }];

      await api.addConvoMembers('jwt', 'c1', ['did:example:a']);

      const call = api.authCalls[0];
      expect(call.endpoint).toBe('/chat.bsky.convo.addMembers');
      expect(call.options.body).toEqual({ convoId: 'c1', dids: ['did:example:a'] });
    });

    it('removeConvoMembers posts the dids', async () => {
      const api = new TestApi();
      api.responses = [{ convo: { id: 'c1' } }];

      await api.removeConvoMembers('jwt', 'c1', ['did:example:a']);

      const call = api.authCalls[0];
      expect(call.endpoint).toBe('/chat.bsky.convo.removeMembers');
      expect(call.options.body).toEqual({ convoId: 'c1', dids: ['did:example:a'] });
    });

    it('updateConvoName posts the new name', async () => {
      const api = new TestApi();
      api.responses = [{ convo: { id: 'c1' } }];

      await api.updateConvoName('jwt', 'c1', 'Team chat');

      const call = api.authCalls[0];
      expect(call.endpoint).toBe('/chat.bsky.convo.updateConvoName');
      expect(call.options.body).toEqual({ convoId: 'c1', name: 'Team chat' });
    });

    it('muteConvo and unmuteConvo hit their endpoints', async () => {
      const api = new TestApi();
      api.responses = [{ convo: { id: 'c1' } }, { convo: { id: 'c1' } }];

      await api.muteConvo('jwt', 'c1');
      await api.unmuteConvo('jwt', 'c1');

      expect(api.authCalls[0].endpoint).toBe('/chat.bsky.convo.muteConvo');
      expect(api.authCalls[0].options.body).toEqual({ convoId: 'c1' });
      expect(api.authCalls[1].endpoint).toBe('/chat.bsky.convo.unmuteConvo');
      expect(api.authCalls[1].options.body).toEqual({ convoId: 'c1' });
    });

    it('addReaction and removeReaction post convoId/messageId/value', async () => {
      const api = new TestApi();
      api.responses = [{}, {}];

      await api.addReaction('jwt', 'c1', 'm1', '👍');
      await api.removeReaction('jwt', 'c1', 'm1', '👍');

      expect(api.authCalls[0].endpoint).toBe('/chat.bsky.convo.addReaction');
      expect(api.authCalls[0].options.body).toEqual({ convoId: 'c1', messageId: 'm1', value: '👍' });
      expect(api.authCalls[1].endpoint).toBe('/chat.bsky.convo.removeReaction');
      expect(api.authCalls[1].options.body).toEqual({ convoId: 'c1', messageId: 'm1', value: '👍' });
    });
  });

  describe('graph', () => {
    it('followUser creates a follow record', async () => {
      const api = new TestApi();
      api.responses = [{ uri: 'at://follow/1' }];

      await api.followUser('jwt', 'did:example:me', 'did:example:other');

      const call = api.authCalls[0];
      expect(call.endpoint).toBe('/com.atproto.repo.createRecord');
      expect(call.options.body).toMatchObject({
        repo: 'did:example:me',
        collection: 'app.bsky.graph.follow',
        record: { $type: 'app.bsky.graph.follow', subject: 'did:example:other' },
      });
    });

    it('unfollowUser deletes the parsed follow record', async () => {
      const api = new TestApi();
      api.responses = [{}];

      await api.unfollowUser('jwt', 'at://did:example:me/app.bsky.graph.follow/rk1');

      expect(api.authCalls[0]).toEqual({
        endpoint: '/com.atproto.repo.deleteRecord',
        accessJwt: 'jwt',
        options: {
          method: 'POST',
          body: { repo: 'did:example:me', collection: 'app.bsky.graph.follow', rkey: 'rk1' },
        },
      });
    });

    it('blockUser creates a block record', async () => {
      const api = new TestApi();
      api.responses = [{ uri: 'at://block/1' }];

      await api.blockUser('jwt', 'did:example:me', 'did:example:other');

      const call = api.authCalls[0];
      expect(call.endpoint).toBe('/com.atproto.repo.createRecord');
      expect(call.options.body).toMatchObject({
        repo: 'did:example:me',
        collection: 'app.bsky.graph.block',
        record: { $type: 'app.bsky.graph.block', subject: 'did:example:other' },
      });
    });

    it('unblockUser deletes the parsed block record', async () => {
      const api = new TestApi();
      api.responses = [{}];

      await api.unblockUser('jwt', 'at://did:example:me/app.bsky.graph.block/rk2');

      expect(api.authCalls[0].options.body).toEqual({
        repo: 'did:example:me',
        collection: 'app.bsky.graph.block',
        rkey: 'rk2',
      });
    });

    it('muteUser and unmuteUser post the actor', async () => {
      const api = new TestApi();
      api.responses = [{}, {}];

      await api.muteUser('jwt', 'did:example:other');
      await api.unmuteUser('jwt', 'did:example:other');

      expect(api.authCalls[0]).toEqual({
        endpoint: '/app.bsky.graph.muteActor',
        accessJwt: 'jwt',
        options: { method: 'POST', body: { actor: 'did:example:other' } },
      });
      expect(api.authCalls[1].endpoint).toBe('/app.bsky.graph.unmuteActor');
      expect(api.authCalls[1].options.body).toEqual({ actor: 'did:example:other' });
    });

    it('muteActorList and unmuteActorList post the list uri', async () => {
      const api = new TestApi();
      api.responses = [{}, {}];

      await api.muteActorList('jwt', 'at://list/1');
      await api.unmuteActorList('jwt', 'at://list/1');

      expect(api.authCalls[0].endpoint).toBe('/app.bsky.graph.muteActorList');
      expect(api.authCalls[0].options.body).toEqual({ list: 'at://list/1' });
      expect(api.authCalls[1].endpoint).toBe('/app.bsky.graph.unmuteActorList');
      expect(api.authCalls[1].options.body).toEqual({ list: 'at://list/1' });
    });

    it('blockActorList creates a listblock record', async () => {
      const api = new TestApi();
      api.responses = [{ uri: 'at://listblock/1' }];

      await api.blockActorList('jwt', 'did:example:me', 'at://list/1');

      const call = api.authCalls[0];
      expect(call.endpoint).toBe('/com.atproto.repo.createRecord');
      expect(call.options.body).toMatchObject({
        repo: 'did:example:me',
        collection: 'app.bsky.graph.listblock',
        record: { $type: 'app.bsky.graph.listblock', subject: 'at://list/1' },
      });
    });

    it('unblockActorList deletes the parsed listblock record', async () => {
      const api = new TestApi();
      api.responses = [{}];

      await api.unblockActorList('jwt', 'at://did:example:me/app.bsky.graph.listblock/rk3');

      expect(api.authCalls[0].options.body).toEqual({
        repo: 'did:example:me',
        collection: 'app.bsky.graph.listblock',
        rkey: 'rk3',
      });
    });

    it('getMutes forwards limit and cursor', async () => {
      const api = new TestApi();
      api.responses = [{ mutes: [] }];

      await api.getMutes('jwt', 10, 'cursor-1');

      expect(api.authCalls[0]).toEqual({
        endpoint: '/app.bsky.graph.getMutes',
        accessJwt: 'jwt',
        options: { params: { limit: '10', cursor: 'cursor-1' } },
      });
    });

    it('getBlocks defaults the limit and omits cursor', async () => {
      const api = new TestApi();
      api.responses = [{ blocks: [] }];

      await api.getBlocks('jwt');

      expect(api.authCalls[0]).toEqual({
        endpoint: '/app.bsky.graph.getBlocks',
        accessJwt: 'jwt',
        options: { params: { limit: '50' } },
      });
    });

    it('getFollows forwards actor and default limit', async () => {
      const api = new TestApi();
      api.responses = [{ follows: [] }];

      await api.getFollows('jwt', 'did:example:alice');

      expect(api.authCalls[0]).toEqual({
        endpoint: '/app.bsky.graph.getFollows',
        accessJwt: 'jwt',
        options: { params: { actor: 'did:example:alice', limit: '100' } },
      });
    });

    it('listFollowRecords lists the follow collection records', async () => {
      const api = new TestApi();
      api.responses = [{ records: [] }];

      await api.listFollowRecords('jwt', 'did:example:me', 50, 'cursor-1');

      expect(api.authCalls[0]).toEqual({
        endpoint: '/com.atproto.repo.listRecords',
        accessJwt: 'jwt',
        options: {
          params: {
            repo: 'did:example:me',
            collection: 'app.bsky.graph.follow',
            limit: '50',
            cursor: 'cursor-1',
          },
        },
      });
    });

    it('getListMutes and getListBlocks hit their endpoints', async () => {
      const api = new TestApi();
      api.responses = [{ lists: [] }, { lists: [] }];

      await api.getListMutes('jwt');
      await api.getListBlocks('jwt', 25);

      expect(api.authCalls[0].endpoint).toBe('/app.bsky.graph.getListMutes');
      expect(api.authCalls[0].options.params).toEqual({ limit: '50' });
      expect(api.authCalls[1].endpoint).toBe('/app.bsky.graph.getListBlocks');
      expect(api.authCalls[1].options.params).toEqual({ limit: '25' });
    });

    it('muteThread and unmuteThread post the root uri', async () => {
      const api = new TestApi();
      api.responses = [{}, {}];

      await api.muteThread('jwt', 'at://post/root');
      await api.unmuteThread('jwt', 'at://post/root');

      expect(api.authCalls[0].endpoint).toBe('/app.bsky.graph.muteThread');
      expect(api.authCalls[0].options.body).toEqual({ root: 'at://post/root' });
      expect(api.authCalls[1].endpoint).toBe('/app.bsky.graph.unmuteThread');
      expect(api.authCalls[1].options.body).toEqual({ root: 'at://post/root' });
    });

    it('getLists forwards actor and default limit', async () => {
      const api = new TestApi();
      api.responses = [{ lists: [] }];

      await api.getLists('jwt', 'did:example:alice');

      expect(api.authCalls[0]).toEqual({
        endpoint: '/app.bsky.graph.getLists',
        accessJwt: 'jwt',
        options: { params: { actor: 'did:example:alice', limit: '50' } },
      });
    });

    it('getList forwards the list uri, limit and cursor', async () => {
      const api = new TestApi();
      api.responses = [{ list: {}, items: [] }];

      await api.getList('jwt', 'at://list/1', 20, 'cursor-1');

      expect(api.authCalls[0]).toEqual({
        endpoint: '/app.bsky.graph.getList',
        accessJwt: 'jwt',
        options: { params: { list: 'at://list/1', limit: '20', cursor: 'cursor-1' } },
      });
    });

    it('createList creates a list record', async () => {
      const api = new TestApi();
      api.responses = [{ uri: 'at://list/1' }];

      await api.createList('jwt', 'did:example:me', {
        name: 'My list',
        purpose: 'app.bsky.graph.defs#curatelist',
        description: 'desc',
      });

      const call = api.authCalls[0];
      expect(call.endpoint).toBe('/com.atproto.repo.createRecord');
      expect(call.options.body).toMatchObject({
        repo: 'did:example:me',
        collection: 'app.bsky.graph.list',
        record: {
          $type: 'app.bsky.graph.list',
          name: 'My list',
          purpose: 'app.bsky.graph.defs#curatelist',
          description: 'desc',
        },
      });
    });

    it('addToList creates a listitem record', async () => {
      const api = new TestApi();
      api.responses = [{ uri: 'at://listitem/1' }];

      await api.addToList('jwt', 'did:example:me', 'at://list/1', 'did:example:other');

      const call = api.authCalls[0];
      expect(call.endpoint).toBe('/com.atproto.repo.createRecord');
      expect(call.options.body).toMatchObject({
        repo: 'did:example:me',
        collection: 'app.bsky.graph.listitem',
        record: { $type: 'app.bsky.graph.listitem', subject: 'did:example:other', list: 'at://list/1' },
      });
    });

    it('removeFromList deletes by listitem uri', async () => {
      const api = new TestApi();
      api.responses = [{}];

      await api.removeFromList('jwt', 'at://listitem/1');

      expect(api.authCalls[0]).toEqual({
        endpoint: '/com.atproto.repo.deleteRecord',
        accessJwt: 'jwt',
        options: { method: 'POST', body: { uri: 'at://listitem/1' } },
      });
    });
  });

  describe('search and notifications', () => {
    it('searchProfiles forwards the query and default limit', async () => {
      const api = new TestApi();
      const response = { actors: [] } as unknown as BlueskySearchActorsResponse;
      api.responses = [response];

      const result = await api.searchProfiles('jwt', 'alice');

      expect(result).toBe(response);
      expect(api.authCalls[0]).toEqual({
        endpoint: '/app.bsky.actor.searchActors',
        accessJwt: 'jwt',
        options: { params: { q: 'alice', limit: '20' } },
      });
    });

    it('searchPosts forwards query, limit, cursor and sort', async () => {
      const api = new TestApi();
      const response = { posts: [] } as unknown as BlueskySearchPostsResponse;
      api.responses = [response];

      const result = await api.searchPosts('jwt', 'cats', 10, 'cursor-1', 'latest');

      expect(result).toBe(response);
      expect(api.authCalls[0]).toEqual({
        endpoint: '/app.bsky.feed.searchPosts',
        accessJwt: 'jwt',
        options: { params: { q: 'cats', limit: '10', cursor: 'cursor-1', sort: 'latest' } },
      });
    });

    it('listNotifications forwards limit, reasons, priority and seenAt', async () => {
      const api = new TestApi();
      const response = { notifications: [] } as unknown as BlueskyNotificationsResponse;
      api.responses = [response];

      const result = await api.listNotifications('jwt', 20, 'cursor-1', ['like', 'follow'], true, '2026-01-01');

      expect(result).toBe(response);
      expect(api.authCalls[0]).toEqual({
        endpoint: '/app.bsky.notification.listNotifications',
        accessJwt: 'jwt',
        options: {
          params: {
            limit: '20',
            cursor: 'cursor-1',
            priority: 'true',
            seenAt: '2026-01-01',
            reasons: ['like', 'follow'],
          },
        },
      });
    });

    it('listNotifications omits optional filters when not provided', async () => {
      const api = new TestApi();
      api.responses = [{ notifications: [] }];

      await api.listNotifications('jwt');

      expect(api.authCalls[0].options.params).toEqual({ limit: '50' });
    });

    it('getUnreadNotificationsCount hits the unread count endpoint', async () => {
      const api = new TestApi();
      const response = { count: 3 } as BlueskyUnreadNotificationCount;
      api.responses = [response];

      const result = await api.getUnreadNotificationsCount('jwt');

      expect(result).toBe(response);
      expect(api.authCalls[0]).toEqual({
        endpoint: '/app.bsky.notification.getUnreadCount',
        accessJwt: 'jwt',
        options: {},
      });
    });

    it('markNotificationsSeen posts a seenAt timestamp', async () => {
      const api = new TestApi();
      api.responses = [undefined];

      await api.markNotificationsSeen('jwt');

      const call = api.authCalls[0];
      expect(call.endpoint).toBe('/app.bsky.notification.updateSeen');
      expect(call.options.method).toBe('POST');
      expect(typeof (call.options.body as { seenAt: string }).seenAt).toBe('string');
    });

    it('getNotificationPreferences unwraps the preferences field', async () => {
      const api = new TestApi();
      const prefs = { chat: { include: 'all' } };
      api.responses = [{ preferences: prefs }];

      const result = await api.getNotificationPreferences('jwt');

      expect(result).toBe(prefs);
      expect(api.authCalls[0].endpoint).toBe('/app.bsky.notification.getPreferences');
    });

    it('putNotificationPreferencesV2 posts the prefs', async () => {
      const api = new TestApi();
      api.responses = [undefined];
      const prefs = { chat: { include: 'all', push: true } } as never;

      await api.putNotificationPreferencesV2('jwt', prefs);

      const call = api.authCalls[0];
      expect(call.endpoint).toBe('/app.bsky.notification.putPreferencesV2');
      expect(call.options.method).toBe('POST');
      expect(call.options.body).toBe(prefs);
    });
  });

  describe('static helper', () => {
    it('createWithPDS returns a BlueskyApi instance', () => {
      const api = BlueskyApi.createWithPDS('https://pds.example');
      expect(api).toBeInstanceOf(BlueskyApi);
    });
  });
});
