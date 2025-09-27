import { BlueskyAuth } from './auth';
import type { BlueskySession } from './types';

describe('BlueskyAuth', () => {
  class TestAuth extends BlueskyAuth {
    public lastCall?: {
      endpoint: string;
      options: {
        method?: 'GET' | 'POST';
        headers?: Record<string, string>;
        body?: Record<string, unknown> | FormData | Blob;
        queryParameters?: Record<string, string>;
      };
    };

    public response: unknown;

    constructor() {
      super('https://pds.example');
    }

    protected async makeRequest<T>(
      endpoint: string,
      options: {
        method?: 'GET' | 'POST';
        headers?: Record<string, string>;
        body?: Record<string, unknown> | FormData | Blob;
        queryParameters?: Record<string, string>;
      } = {},
    ): Promise<T> {
      this.lastCall = { endpoint, options };
      return this.response as T;
    }
  }

  it('creates a session with the provided credentials', async () => {
    const auth = new TestAuth();
    const session: BlueskySession = {
      did: 'did:example:alice',
      handle: 'alice.test',
      active: true,
      accessJwt: 'access-token',
      refreshJwt: 'refresh-token',
    };
    auth.response = session;

    const result = await auth.createSession('alice.test', 'password-123');

    expect(result).toEqual(session);
    expect(auth.lastCall).toEqual({
      endpoint: '/com.atproto.server.createSession',
      options: {
        method: 'POST',
        body: {
          identifier: 'alice.test',
          password: 'password-123',
        },
      },
    });
  });

  it('refreshes a session using the refresh token', async () => {
    const auth = new TestAuth();
    const session: BlueskySession = {
      did: 'did:example:alice',
      handle: 'alice.test',
      active: true,
      accessJwt: 'access-token',
      refreshJwt: 'new-refresh',
    };
    auth.response = session;

    const result = await auth.refreshSession('refresh-token');

    expect(result).toEqual(session);
    expect(auth.lastCall).toEqual({
      endpoint: '/com.atproto.server.refreshSession',
      options: {
        method: 'POST',
        headers: { Authorization: 'Bearer refresh-token' },
      },
    });
  });
});
