import { BlueskyRepos } from './repos';

describe('BlueskyRepos', () => {
  class TestRepos extends BlueskyRepos {
    public calls: {
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
      this.calls.push({ endpoint, accessJwt, options });
      return (this.responses.shift() as T) ?? (undefined as T);
    }
  }

  it('fetches Tangled repos for an actor with pagination support', async () => {
    const repos = new TestRepos();
    repos.responses = [
      {
        cursor: 'cursor-2',
        records: [],
      },
    ];

    const result = await repos.getActorRepos('jwt', 'did:example:alice', 25, 'cursor-1');

    expect(result).toEqual({ cursor: 'cursor-2', records: [] });
    expect(repos.calls).toEqual([
      {
        endpoint: '/com.atproto.repo.listRecords',
        accessJwt: 'jwt',
        options: {
          params: {
            repo: 'did:example:alice',
            collection: 'sh.tangled.repo',
            limit: '25',
            cursor: 'cursor-1',
          },
        },
      },
    ]);
  });

  it('omits cursor when not provided', async () => {
    const repos = new TestRepos();
    repos.responses = [
      {
        records: [],
      },
    ];

    await repos.getActorRepos('jwt', 'alice.test');

    expect(repos.calls[0]).toEqual({
      endpoint: '/com.atproto.repo.listRecords',
      accessJwt: 'jwt',
      options: {
        params: {
          repo: 'alice.test',
          collection: 'sh.tangled.repo',
          limit: '50',
        },
      },
    });
  });
});
