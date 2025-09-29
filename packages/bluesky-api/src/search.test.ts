import { BlueskySearch } from './search';
import type {
  BlueskySearchActorsResponse,
  BlueskySearchPostsResponse,
  BlueskySession,
} from './types';

describe('BlueskySearch', () => {
  const createSession = (overrides: Partial<BlueskySession> = {}): BlueskySession =>
    ({
      handle: 'user.test',
      did: 'did:plc:123',
      active: true,
      accessJwt: 'jwt',
      refreshJwt: 'refresh',
      ...overrides,
    } as BlueskySession);

  class TestSearch extends BlueskySearch {
    public calls: {
      endpoint: string;
      accessJwt: string;
      options: {
        method?: 'GET' | 'POST';
        params?: Record<string, string | string[]>;
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
      options: {
        method?: 'GET' | 'POST';
        params?: Record<string, string | string[]>;
        headers?: Record<string, string>;
        body?: Record<string, unknown> | FormData | Blob;
      } = {},
    ): Promise<T> {
      const session = this.requireSession();
      this.calls.push({ endpoint, accessJwt: session.accessJwt, options });
      return (this.responses.shift() as T) ?? (undefined as T);
    }
  }

  it('searches profiles and forwards pagination cursor', async () => {
    const search = new TestSearch();
    const response = { actors: [] } as unknown as BlueskySearchActorsResponse;
    search.responses = [response];

    const session = createSession();
    search.useSession(session);
    const result = await search.searchProfiles('carol', 15, 'cursor-abc');

    expect(result).toBe(response);
    expect(search.calls).toEqual([
      {
        endpoint: '/app.bsky.actor.searchActors',
        accessJwt: session.accessJwt,
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

    const session = createSession();
    search.useSession(session);
    const result = await search.searchPosts('hello world');

    expect(result).toBe(response);
    expect(search.calls).toEqual([
      {
        endpoint: '/app.bsky.feed.searchPosts',
        accessJwt: session.accessJwt,
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
