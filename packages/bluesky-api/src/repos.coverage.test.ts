import { BlueskyRepos, type AiPreferencesRecord } from './repos';
import type { CreateReviewInput } from './types';

type AuthCall = {
  endpoint: string;
  accessJwt: string;
  options: {
    method?: 'GET' | 'POST';
    body?: Record<string, unknown> | FormData | Blob;
    params?: Record<string, string | string[]>;
    headers?: Record<string, string>;
  };
};

describe('BlueskyRepos (coverage)', () => {
  class TestRepos extends BlueskyRepos {
    public calls: AuthCall[] = [];
    public responses: unknown[] = [];
    public errors: unknown[] = [];

    constructor() {
      super('https://pds.example');
    }

    protected async makeAuthenticatedRequest<T>(
      endpoint: string,
      accessJwt: string,
      options: AuthCall['options'] = {},
    ): Promise<T> {
      this.calls.push({ endpoint, accessJwt, options });
      if (this.errors.length > 0) {
        throw this.errors.shift();
      }
      return (this.responses.shift() as T) ?? (undefined as T);
    }
  }

  describe('getActorRecipes', () => {
    it('fetches recipes and omits cursor when not provided', async () => {
      const repos = new TestRepos();
      repos.responses = [{ records: [] }];

      const result = await repos.getActorRecipes('jwt', 'did:example:alice');

      expect(result).toEqual({ records: [] });
      expect(repos.calls[0]).toEqual({
        endpoint: '/com.atproto.repo.listRecords',
        accessJwt: 'jwt',
        options: {
          params: {
            repo: 'did:example:alice',
            collection: 'exchange.recipe.recipe',
          },
        },
      });
    });

    it('includes cursor when provided', async () => {
      const repos = new TestRepos();
      repos.responses = [{ records: [], cursor: 'next' }];

      await repos.getActorRecipes('jwt', 'alice.test', 10, 'cursor-1');

      expect(repos.calls[0].options.params).toEqual({
        repo: 'alice.test',
        collection: 'exchange.recipe.recipe',
        cursor: 'cursor-1',
      });
    });
  });

  describe('getActorLinkatBoards', () => {
    it('fetches link boards with default limit and no cursor', async () => {
      const repos = new TestRepos();
      repos.responses = [{ records: [{ uri: 'at://board' }], cursor: undefined }];

      const result = await repos.getActorLinkatBoards('jwt', 'did:example:alice');

      expect(result).toEqual({ records: [{ uri: 'at://board' }], cursor: undefined });
      expect(repos.calls[0]).toEqual({
        endpoint: '/com.atproto.repo.listRecords',
        accessJwt: 'jwt',
        options: {
          params: {
            repo: 'did:example:alice',
            collection: 'blue.linkat.board',
            limit: '50',
          },
        },
      });
    });

    it('includes cursor and custom limit when provided', async () => {
      const repos = new TestRepos();
      repos.responses = [{ records: [] }];

      await repos.getActorLinkatBoards('jwt', 'alice.test', 20, 'cursor-1');

      expect(repos.calls[0].options.params).toEqual({
        repo: 'alice.test',
        collection: 'blue.linkat.board',
        limit: '20',
        cursor: 'cursor-1',
      });
    });

    it('returns an empty response when the request throws', async () => {
      const repos = new TestRepos();
      repos.errors = [new Error('collection not found')];

      const result = await repos.getActorLinkatBoards('jwt', 'alice.test');

      expect(result).toEqual({ records: [], cursor: undefined });
    });
  });

  describe('createReview', () => {
    const baseReview: CreateReviewInput = {
      identifiers: { tmdbId: '123' },
      creativeWorkType: 'movie',
      rating: 5,
    };

    it('builds a minimal record without optional fields', async () => {
      const repos = new TestRepos();
      repos.responses = [{ uri: 'at://review', cid: 'cid1' }];

      const result = await repos.createReview('jwt', 'did:example:alice', baseReview);

      expect(result).toEqual({ uri: 'at://review', cid: 'cid1' });
      const call = repos.calls[0];
      expect(call.endpoint).toBe('/com.atproto.repo.createRecord');
      expect(call.accessJwt).toBe('jwt');
      expect(call.options.method).toBe('POST');

      const body = call.options.body as { repo: string; collection: string; record: Record<string, unknown> };
      expect(body.repo).toBe('did:example:alice');
      expect(body.collection).toBe('social.popfeed.feed.review');
      expect(body.record.$type).toBe('social.popfeed.feed.review');
      expect(body.record.identifiers).toEqual(baseReview.identifiers);
      expect(body.record.creativeWorkType).toBe('movie');
      expect(body.record.rating).toBe(5);
      expect(typeof body.record.createdAt).toBe('string');
      // None of the optional fields should be present.
      for (const key of [
        'text',
        'title',
        'poster',
        'tags',
        'genres',
        'mainCredit',
        'mainCreditRole',
        'isRevisit',
        'containsSpoilers',
        'releaseDate',
        'posterUrl',
      ]) {
        expect(key in body.record).toBe(false);
      }
    });

    it('includes every optional field when provided', async () => {
      const repos = new TestRepos();
      repos.responses = [{ uri: 'at://review', cid: 'cid2' }];

      const poster = { $type: 'blob' as const, ref: { $link: 'blob-link' }, mimeType: 'image/jpeg', size: 1234 };
      const review: CreateReviewInput = {
        ...baseReview,
        text: 'great',
        title: 'A Title',
        poster,
        tags: ['tag1', 'tag2'],
        genres: ['drama'],
        mainCredit: 'Director Name',
        mainCreditRole: 'director',
        isRevisit: true,
        containsSpoilers: false,
        releaseDate: '2020-01-01',
        posterUrl: 'https://example.com/poster.jpg',
      };

      await repos.createReview('jwt', 'did:example:alice', review);

      const body = repos.calls[0].options.body as { record: Record<string, unknown> };
      expect(body.record.text).toBe('great');
      expect(body.record.title).toBe('A Title');
      expect(body.record.poster).toEqual(poster);
      expect(body.record.tags).toEqual(['tag1', 'tag2']);
      expect(body.record.genres).toEqual(['drama']);
      expect(body.record.mainCredit).toBe('Director Name');
      expect(body.record.mainCreditRole).toBe('director');
      expect(body.record.isRevisit).toBe(true);
      expect(body.record.containsSpoilers).toBe(false);
      expect(body.record.releaseDate).toBe('2020-01-01');
      expect(body.record.posterUrl).toBe('https://example.com/poster.jpg');
    });
  });

  describe('getAiPreferences', () => {
    const record: AiPreferencesRecord = {
      $type: 'community.lexicon.preference.ai',
      preferences: {
        embedding: { allow: true, updatedAt: '2020-01-01' },
        inference: { allow: false, updatedAt: '2020-01-01' },
        syntheticContent: { allow: true, updatedAt: '2020-01-01' },
        training: { allow: false, updatedAt: '2020-01-01' },
      },
      scope: { $type: 'community.lexicon.preference.ai#globalScope' },
      updatedAt: '2020-01-01',
    };

    it('returns the record value on success', async () => {
      const repos = new TestRepos();
      repos.responses = [{ uri: 'at://pref', cid: 'cid', value: record }];

      const result = await repos.getAiPreferences('jwt', 'did:example:alice');

      expect(result).toEqual(record);
      expect(repos.calls[0]).toEqual({
        endpoint: '/com.atproto.repo.getRecord',
        accessJwt: 'jwt',
        options: {
          params: {
            repo: 'did:example:alice',
            collection: 'community.lexicon.preference.ai',
            rkey: 'self',
          },
        },
      });
    });

    it('returns null when the record is not found via errorCode', async () => {
      const repos = new TestRepos();
      repos.errors = [{ errorCode: 'RecordNotFound' }];

      const result = await repos.getAiPreferences('jwt', 'did:example:alice');

      expect(result).toBeNull();
    });

    it('returns null when the request fails with status 404', async () => {
      const repos = new TestRepos();
      repos.errors = [{ status: 404 }];

      const result = await repos.getAiPreferences('jwt', 'did:example:alice');

      expect(result).toBeNull();
    });

    it('rethrows other errors', async () => {
      const repos = new TestRepos();
      const err = { status: 500, errorCode: 'InternalError' };
      repos.errors = [err];

      await expect(repos.getAiPreferences('jwt', 'did:example:alice')).rejects.toBe(err);
    });
  });

  describe('putAiPreferences', () => {
    it('writes the record at rkey self', async () => {
      const repos = new TestRepos();
      repos.responses = [{ uri: 'at://pref', cid: 'cid' }];

      const record: AiPreferencesRecord = {
        $type: 'community.lexicon.preference.ai',
        preferences: {
          embedding: { allow: true, updatedAt: '2020-01-01' },
          inference: { allow: true, updatedAt: '2020-01-01' },
          syntheticContent: { allow: true, updatedAt: '2020-01-01' },
          training: { allow: true, updatedAt: '2020-01-01' },
        },
        scope: { $type: 'community.lexicon.preference.ai#globalScope' },
        updatedAt: '2020-01-01',
      };

      const result = await repos.putAiPreferences('jwt', 'did:example:alice', record);

      expect(result).toEqual({ uri: 'at://pref', cid: 'cid' });
      expect(repos.calls[0]).toEqual({
        endpoint: '/com.atproto.repo.putRecord',
        accessJwt: 'jwt',
        options: {
          method: 'POST',
          body: {
            repo: 'did:example:alice',
            collection: 'community.lexicon.preference.ai',
            rkey: 'self',
            record,
          },
        },
      });
    });
  });
});
