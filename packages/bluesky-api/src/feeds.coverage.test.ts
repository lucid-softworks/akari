import { BlueskyFeeds } from './feeds';
import type { BlueskyUploadBlobResponse } from './types';

type RequestOptions = {
  method?: 'GET' | 'POST';
  body?: Record<string, unknown> | FormData | Blob;
  params?: Record<string, string | string[]>;
  headers?: Record<string, string>;
};

/**
 * Covers the BlueskyFeeds methods not exercised by feeds.test.ts:
 * getPosts, repostPost, unrepostPost, createReport, setThreadgate,
 * setPostgate, and sendInteractions. Uses the same subclass-override
 * pattern as feeds.test.ts — replacing the protected request helpers
 * with capturing stubs that share a single response queue.
 */
class TestFeeds extends BlueskyFeeds {
  public authCalls: { endpoint: string; accessJwt: string; options: RequestOptions }[] = [];
  public responses: unknown[] = [];

  constructor() {
    super('https://pds.example');
  }

  protected async makeAuthenticatedRequest<T>(
    endpoint: string,
    accessJwt: string,
    options: RequestOptions = {},
  ): Promise<T> {
    this.authCalls.push({ endpoint, accessJwt, options });
    return (this.responses.shift() as T) ?? (undefined as T);
  }
}

describe('BlueskyFeeds (coverage)', () => {
  describe('getPosts', () => {
    it('short-circuits to an empty page for an empty uri list', async () => {
      const feeds = new TestFeeds();

      const result = await feeds.getPosts('jwt', []);

      expect(result).toEqual({ posts: [] });
      expect(feeds.authCalls).toHaveLength(0);
    });

    it('forwards the (capped) uri list with the labeler header', async () => {
      const feeds = new TestFeeds();
      const response = { posts: [] };
      feeds.responses = [response];

      const result = await feeds.getPosts('jwt', ['at://post/1', 'at://post/2']);

      expect(result).toBe(response);
      const call = feeds.authCalls[0];
      expect(call.endpoint).toBe('/app.bsky.feed.getPosts');
      expect(call.options.params).toEqual({ uris: ['at://post/1', 'at://post/2'] });
      expect(call.options.headers?.['atproto-accept-labelers']).toBe(
        'did:plc:ar7c4by46qjdydhdevvrndac;redact',
      );
    });

    it('caps the uri list at 25 entries', async () => {
      const feeds = new TestFeeds();
      feeds.responses = [{ posts: [] }];
      const uris = Array.from({ length: 30 }, (_, i) => `at://post/${i}`);

      await feeds.getPosts('jwt', uris);

      const params = feeds.authCalls[0].options.params as { uris: string[] };
      expect(params.uris).toHaveLength(25);
    });
  });

  describe('repostPost / unrepostPost', () => {
    it('repostPost creates a repost record', async () => {
      const feeds = new TestFeeds();
      const response = { uri: 'at://repost/1' };
      feeds.responses = [response];

      const result = await feeds.repostPost('jwt', 'at://post/5', 'cid123', 'did:example:me');

      expect(result).toBe(response as never);
      const call = feeds.authCalls[0];
      expect(call.endpoint).toBe('/com.atproto.repo.createRecord');
      expect(call.options.method).toBe('POST');
      expect(call.options.body).toMatchObject({
        repo: 'did:example:me',
        collection: 'app.bsky.feed.repost',
        record: {
          subject: { uri: 'at://post/5', cid: 'cid123' },
          $type: 'app.bsky.feed.repost',
        },
      });
      const record = (call.options.body as Record<string, unknown>).record as Record<string, unknown>;
      expect(typeof record.createdAt).toBe('string');
    });

    it('unrepostPost deletes the repost record by rkey', async () => {
      const feeds = new TestFeeds();
      feeds.responses = [{ success: true }];

      await feeds.unrepostPost('jwt', 'at://did:example:me/app.bsky.feed.repost/999', 'did:example:me');

      expect(feeds.authCalls[0]).toEqual({
        endpoint: '/com.atproto.repo.deleteRecord',
        accessJwt: 'jwt',
        options: {
          method: 'POST',
          body: { collection: 'app.bsky.feed.repost', repo: 'did:example:me', rkey: '999' },
        },
      });
    });

    it('unrepostPost throws when the repost URI has no rkey', async () => {
      const feeds = new TestFeeds();

      await expect(feeds.unrepostPost('jwt', '', 'did:example:me')).rejects.toThrow(
        'Invalid repost URI: could not extract rkey',
      );
      expect(feeds.authCalls).toHaveLength(0);
    });
  });

  describe('createReport', () => {
    it('reports an account via repoRef without a labeler header', async () => {
      const feeds = new TestFeeds();
      feeds.responses = [{ id: 1 }];

      await feeds.createReport('jwt', { did: 'did:example:bad' }, 'spam', 'because');

      const call = feeds.authCalls[0];
      expect(call.endpoint).toBe('/com.atproto.moderation.createReport');
      expect(call.options.method).toBe('POST');
      expect(call.options.body).toEqual({
        reasonType: 'com.atproto.moderation.defs#spam',
        reason: 'because',
        subject: { $type: 'com.atproto.admin.defs#repoRef', did: 'did:example:bad' },
      });
      expect(call.options.headers).toBeUndefined();
    });

    it('reports a post via strongRef and routes to a labeler', async () => {
      const feeds = new TestFeeds();
      feeds.responses = [{ id: 2 }];

      await feeds.createReport(
        'jwt',
        { uri: 'at://post/1', cid: 'cid1' },
        'violation',
        undefined,
        'did:example:labeler',
      );

      const call = feeds.authCalls[0];
      expect(call.options.body).toMatchObject({
        reasonType: 'com.atproto.moderation.defs#violation',
        subject: { $type: 'com.atproto.repo.strongRef', uri: 'at://post/1', cid: 'cid1' },
      });
      expect(call.options.headers).toEqual({ 'atproto-proxy': 'did:example:labeler#atproto_labeler' });
    });
  });

  describe('setThreadgate', () => {
    it('writes a nobody record with an empty allow list', async () => {
      const feeds = new TestFeeds();
      feeds.responses = [{ uri: 'at://gate/1' }];

      await feeds.setThreadgate('jwt', 'did:example:me', 'at://did:example:me/app.bsky.feed.post/abc', {
        type: 'nobody',
      });

      const call = feeds.authCalls[0];
      expect(call.endpoint).toBe('/com.atproto.repo.putRecord');
      const body = call.options.body as { repo: string; collection: string; rkey: string; record: Record<string, unknown> };
      expect(body.repo).toBe('did:example:me');
      expect(body.collection).toBe('app.bsky.feed.threadgate');
      expect(body.rkey).toBe('abc');
      expect(body.record.allow).toEqual([]);
    });

    it('maps limited rules to lexicon rule objects', async () => {
      const feeds = new TestFeeds();
      feeds.responses = [{ uri: 'at://gate/1' }];

      await feeds.setThreadgate('jwt', 'did:example:me', 'at://did:example:me/app.bsky.feed.post/abc', {
        type: 'limited',
        mention: true,
        following: true,
        follower: true,
        listUris: ['at://list/1'],
      });

      const body = feeds.authCalls[0].options.body as { record: Record<string, unknown> };
      expect(body.record.allow).toEqual([
        { $type: 'app.bsky.feed.threadgate#mentionRule' },
        { $type: 'app.bsky.feed.threadgate#followingRule' },
        { $type: 'app.bsky.feed.threadgate#followerRule' },
        { $type: 'app.bsky.feed.threadgate#listRule', list: 'at://list/1' },
      ]);
    });

    it('omits allow entirely for everyone', async () => {
      const feeds = new TestFeeds();
      feeds.responses = [{ uri: 'at://gate/1' }];

      await feeds.setThreadgate('jwt', 'did:example:me', 'at://did:example:me/app.bsky.feed.post/abc', {
        type: 'everyone',
      });

      const body = feeds.authCalls[0].options.body as { record: Record<string, unknown> };
      expect(body.record).not.toHaveProperty('allow');
    });

    it('throws when the post URI has no rkey', async () => {
      const feeds = new TestFeeds();

      await expect(
        feeds.setThreadgate('jwt', 'did:example:me', '', { type: 'everyone' }),
      ).rejects.toThrow('Invalid post URI: ');
      expect(feeds.authCalls).toHaveLength(0);
    });
  });

  describe('setPostgate', () => {
    it('disables quotes when allowQuote is false', async () => {
      const feeds = new TestFeeds();
      feeds.responses = [{ uri: 'at://postgate/1' }];

      await feeds.setPostgate('jwt', 'did:example:me', 'at://did:example:me/app.bsky.feed.post/abc', {
        allowQuote: false,
      });

      const call = feeds.authCalls[0];
      expect(call.endpoint).toBe('/com.atproto.repo.putRecord');
      const body = call.options.body as { collection: string; rkey: string; record: Record<string, unknown> };
      expect(body.collection).toBe('app.bsky.feed.postgate');
      expect(body.rkey).toBe('abc');
      expect(body.record.embeddingRules).toEqual([{ $type: 'app.bsky.feed.postgate#disableRule' }]);
    });

    it('leaves quotes enabled with an empty rule list', async () => {
      const feeds = new TestFeeds();
      feeds.responses = [{ uri: 'at://postgate/1' }];

      await feeds.setPostgate('jwt', 'did:example:me', 'at://did:example:me/app.bsky.feed.post/abc', {
        allowQuote: true,
      });

      const body = feeds.authCalls[0].options.body as { record: Record<string, unknown> };
      expect(body.record.embeddingRules).toEqual([]);
    });

    it('throws when the post URI has no rkey', async () => {
      const feeds = new TestFeeds();

      await expect(feeds.setPostgate('jwt', 'did:example:me', '', { allowQuote: true })).rejects.toThrow(
        'Invalid post URI: ',
      );
      expect(feeds.authCalls).toHaveLength(0);
    });
  });

  describe('createPost embed branches', () => {
    it('embeds a video when no media images are present', async () => {
      const feeds = new TestFeeds();
      feeds.responses = [{ uri: 'at://post/vid' }];

      await feeds.createPost('jwt', 'did:example:me', {
        text: 'A video',
        video: {
          blob: { ref: { $link: 'blob/vid' }, mimeType: 'video/mp4', size: 9999 },
          alt: 'clip',
          aspectRatio: { width: 16, height: 9 },
        } as never,
      });

      const body = feeds.authCalls[0].options.body as { record: Record<string, unknown> };
      expect(body.record.embed).toEqual({
        $type: 'app.bsky.embed.video',
        video: { ref: { $link: 'blob/vid' }, mimeType: 'video/mp4', size: 9999 },
        alt: 'clip',
        aspectRatio: { width: 16, height: 9 },
      });
    });

    it('wraps a quote alone in a record embed', async () => {
      const feeds = new TestFeeds();
      feeds.responses = [{ uri: 'at://post/quote' }];

      await feeds.createPost('jwt', 'did:example:me', {
        text: 'Quoting',
        quote: { uri: 'at://post/quoted', cid: 'cid-q' },
      });

      const body = feeds.authCalls[0].options.body as { record: Record<string, unknown> };
      expect(body.record.embed).toEqual({
        $type: 'app.bsky.embed.record',
        record: { uri: 'at://post/quoted', cid: 'cid-q' },
      });
    });

    it('wraps a quote plus media in a recordWithMedia embed', async () => {
      const feeds = new TestFeeds();
      feeds.responses = [{ uri: 'at://post/quote-media' }];
      const uploadResult: BlueskyUploadBlobResponse = {
        blob: { ref: { $link: 'blob/img' }, mimeType: 'image/png', size: 100 },
      };
      const uploadImageSpy = jest.spyOn(feeds, 'uploadImage').mockResolvedValue(uploadResult);

      await feeds.createPost('jwt', 'did:example:me', {
        text: 'Quote with image',
        quote: { uri: 'at://post/quoted', cid: 'cid-q' },
        images: [{ uri: 'file://img.png', mimeType: 'image/png', alt: 'pic' }],
      });

      const body = feeds.authCalls[0].options.body as { record: Record<string, unknown> };
      expect(body.record.embed).toMatchObject({
        $type: 'app.bsky.embed.recordWithMedia',
        record: { $type: 'app.bsky.embed.record', record: { uri: 'at://post/quoted', cid: 'cid-q' } },
        media: { $type: 'app.bsky.embed.images' },
      });

      uploadImageSpy.mockRestore();
    });

    it('embeds an external link when no other media or quote is set', async () => {
      const feeds = new TestFeeds();
      feeds.responses = [{ uri: 'at://post/ext' }];

      await feeds.createPost('jwt', 'did:example:me', {
        text: 'Link post',
        externalEmbed: { uri: 'https://example.com', title: 'Example', description: 'A site' },
      });

      const body = feeds.authCalls[0].options.body as { record: Record<string, unknown> };
      expect(body.record.embed).toEqual({
        $type: 'app.bsky.embed.external',
        external: { uri: 'https://example.com', title: 'Example', description: 'A site' },
      });
    });
  });

  describe('sendInteractions', () => {
    it('proxies events to the feed generator', async () => {
      const feeds = new TestFeeds();
      feeds.responses = [{}];
      const interactions = [{ event: 'app.bsky.feed.defs#requestMore', item: 'at://post/1' }];

      await feeds.sendInteractions('jwt', 'did:example:fg', interactions);

      expect(feeds.authCalls[0]).toEqual({
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
});
