import { BlueskyDrafts } from './draft';
import type {
  BlueskyCreateDraftResponse,
  BlueskyDraft,
  BlueskyGetDraftsResponse,
} from './types';

describe('BlueskyDrafts', () => {
  class TestDrafts extends BlueskyDrafts {
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
  }

  const sampleDraft: BlueskyDraft = {
    posts: [{ text: 'hello world' } as BlueskyDraft['posts'][number]],
    langs: ['en'],
  };

  describe('getDrafts', () => {
    it('lists drafts with no options and an empty params object', async () => {
      const drafts = new TestDrafts();
      const response = { drafts: [] } as BlueskyGetDraftsResponse;
      drafts.responses = [response];

      const result = await drafts.getDrafts('jwt');

      expect(result).toBe(response);
      expect(drafts.authCalls).toEqual([
        {
          endpoint: '/app.bsky.draft.getDrafts',
          accessJwt: 'jwt',
          options: { params: {} },
        },
      ]);
    });

    it('forwards the limit parameter as a string', async () => {
      const drafts = new TestDrafts();
      drafts.responses = [{ drafts: [] } as BlueskyGetDraftsResponse];

      await drafts.getDrafts('jwt', { limit: 25 });

      expect(drafts.authCalls[0].options.params).toEqual({ limit: '25' });
    });

    it('includes the limit even when it is zero', async () => {
      const drafts = new TestDrafts();
      drafts.responses = [{ drafts: [] } as BlueskyGetDraftsResponse];

      await drafts.getDrafts('jwt', { limit: 0 });

      expect(drafts.authCalls[0].options.params).toEqual({ limit: '0' });
    });

    it('forwards both limit and cursor', async () => {
      const drafts = new TestDrafts();
      drafts.responses = [{ drafts: [], cursor: 'next' } as BlueskyGetDraftsResponse];

      await drafts.getDrafts('jwt', { limit: 10, cursor: 'cursor-abc' });

      expect(drafts.authCalls[0]).toEqual({
        endpoint: '/app.bsky.draft.getDrafts',
        accessJwt: 'jwt',
        options: { params: { limit: '10', cursor: 'cursor-abc' } },
      });
    });

    it('omits an empty-string cursor', async () => {
      const drafts = new TestDrafts();
      drafts.responses = [{ drafts: [] } as BlueskyGetDraftsResponse];

      await drafts.getDrafts('jwt', { cursor: '' });

      expect(drafts.authCalls[0].options.params).toEqual({});
    });
  });

  describe('createDraft', () => {
    it('posts the draft wrapped in a draft field and returns the assigned id', async () => {
      const drafts = new TestDrafts();
      const response = { id: 'tid-123' } as BlueskyCreateDraftResponse;
      drafts.responses = [response];

      const result = await drafts.createDraft('jwt', sampleDraft);

      expect(result).toBe(response);
      expect(drafts.authCalls).toEqual([
        {
          endpoint: '/app.bsky.draft.createDraft',
          accessJwt: 'jwt',
          options: { method: 'POST', body: { draft: sampleDraft } },
        },
      ]);
    });
  });

  describe('updateDraft', () => {
    it('posts a nested draft payload and resolves to undefined', async () => {
      const drafts = new TestDrafts();
      drafts.responses = [undefined];

      const result = await drafts.updateDraft('jwt', 'tid-456', sampleDraft);

      expect(result).toBeUndefined();
      expect(drafts.authCalls).toEqual([
        {
          endpoint: '/app.bsky.draft.updateDraft',
          accessJwt: 'jwt',
          options: {
            method: 'POST',
            body: { draft: { id: 'tid-456', draft: sampleDraft } },
          },
        },
      ]);
    });
  });

  describe('deleteDraft', () => {
    it('posts only the id and resolves to undefined', async () => {
      const drafts = new TestDrafts();
      drafts.responses = [undefined];

      const result = await drafts.deleteDraft('jwt', 'tid-789');

      expect(result).toBeUndefined();
      expect(drafts.authCalls).toEqual([
        {
          endpoint: '/app.bsky.draft.deleteDraft',
          accessJwt: 'jwt',
          options: { method: 'POST', body: { id: 'tid-789' } },
        },
      ]);
    });
  });
});
