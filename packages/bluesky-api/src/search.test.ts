import { BlueskySearch } from './search';
import type {
  BlueskySearchActorsResponse,
  BlueskySearchPostsResponse,
} from './types';

describe('BlueskySearch', () => {
  class TestSearch extends BlueskySearch {
    public calls: {
      endpoint: string;
      accessJwt: string;
      options: {
        method?: 'GET' | 'POST';
        params?: Record<string, string>;
        headers?: Record<string, string>;
        body?: Record<string, unknown> | FormData | Blob;
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
        params?: Record<string, string>;
        headers?: Record<string, string>;
        body?: Record<string, unknown> | FormData | Blob;
      } = {},
    ): Promise<T> {
      this.calls.push({ endpoint, accessJwt, options });
      return (this.responses.shift() as T) ?? (undefined as T);
    }
  }

  it('searches profiles and forwards pagination cursor', async () => {
    const search = new TestSearch();
    const response = { actors: [] } as unknown as BlueskySearchActorsResponse;
    search.responses = [response];

    const result = await search.searchProfiles('jwt', 'carol', 15, 'cursor-abc');

    expect(result).toBe(response);
    expect(search.calls).toEqual([
      {
        endpoint: '/app.bsky.actor.searchActors',
        accessJwt: 'jwt',
        options: {
          params: {
            q: 'carol',
            limit: '15',
            cursor: 'cursor-abc',
          },
        },
      },
    ]);
  });

  it('searches posts without a cursor and uses the default limit', async () => {
    const search = new TestSearch();
    const response = { posts: [] } as unknown as BlueskySearchPostsResponse;
    search.responses = [response];

    const result = await search.searchPosts('jwt', 'hello world');

    expect(result).toBe(response);
    expect(search.calls).toEqual([
      {
        endpoint: '/app.bsky.feed.searchPosts',
        accessJwt: 'jwt',
        options: {
          params: {
            q: 'hello world',
            limit: '20',
          },
        },
      },
    ]);
  });
});
