import { BlueskyFlashes } from './flashes';
import type { FlashesStoryRecordsResponse } from './flashes';

describe('BlueskyFlashes', () => {
  class TestFlashes extends BlueskyFlashes {
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

    public responses: unknown[] = [];
    public errors: unknown[] = [];

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
      if (this.errors.length > 0) {
        throw this.errors.shift();
      }
      return (this.responses.shift() as T) ?? (undefined as T);
    }
  }

  it('lists story records with the default limit and no cursor', async () => {
    const flashes = new TestFlashes();
    const response = { records: [] } as FlashesStoryRecordsResponse;
    flashes.responses = [response];

    const result = await flashes.getActorStories('jwt', 'did:example:alice');

    expect(result).toBe(response);
    expect(flashes.authCalls).toEqual([
      {
        endpoint: '/com.atproto.repo.listRecords',
        accessJwt: 'jwt',
        options: {
          params: {
            repo: 'did:example:alice',
            collection: 'blue.flashes.story.post',
            limit: '50',
          },
        },
      },
    ]);
  });

  it('forwards a custom limit and cursor', async () => {
    const flashes = new TestFlashes();
    const response = { records: [], cursor: 'next' } as FlashesStoryRecordsResponse;
    flashes.responses = [response];

    const result = await flashes.getActorStories('jwt', 'did:example:bob', 10, 'cursor-1');

    expect(result).toBe(response);
    expect(flashes.authCalls[0]).toEqual({
      endpoint: '/com.atproto.repo.listRecords',
      accessJwt: 'jwt',
      options: {
        params: {
          repo: 'did:example:bob',
          collection: 'blue.flashes.story.post',
          limit: '10',
          cursor: 'cursor-1',
        },
      },
    });
  });

  it('accepts an empty access token for the public read', async () => {
    const flashes = new TestFlashes();
    flashes.responses = [{ records: [] } as FlashesStoryRecordsResponse];

    await flashes.getActorStories('', 'did:example:carol');

    expect(flashes.authCalls[0].accessJwt).toBe('');
  });

  it('returns an empty result when the request fails', async () => {
    const flashes = new TestFlashes();
    flashes.errors = [new Error('boom')];

    const result = await flashes.getActorStories('jwt', 'did:example:dave', 5, 'cursor-2');

    expect(result).toEqual({ records: [], cursor: undefined });
  });
});
