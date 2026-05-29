import { BlueskyAuth } from './auth';

type RequestOptions = {
  method?: 'GET' | 'POST';
  body?: Record<string, unknown> | FormData | Blob;
  params?: Record<string, string | string[]>;
  headers?: Record<string, string>;
};

class TestAuth extends BlueskyAuth {
  public authCalls: { endpoint: string; accessJwt: string; options: RequestOptions }[] = [];
  public requestCalls: { endpoint: string; options: RequestOptions }[] = [];
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

  protected async makeRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    this.requestCalls.push({ endpoint, options });
    return (this.responses.shift() as T) ?? (undefined as T);
  }
}

describe('BlueskyAuth (coverage)', () => {
  it('requestEmailConfirmation posts to the auth endpoint', async () => {
    const auth = new TestAuth();
    await auth.requestEmailConfirmation('jwt-1');

    expect(auth.authCalls).toEqual([
      {
        endpoint: '/com.atproto.server.requestEmailConfirmation',
        accessJwt: 'jwt-1',
        options: { method: 'POST' },
      },
    ]);
  });

  it('confirmEmail posts the email and token', async () => {
    const auth = new TestAuth();
    await auth.confirmEmail('jwt-2', 'me@example.com', 'token-123');

    expect(auth.authCalls[0]).toEqual({
      endpoint: '/com.atproto.server.confirmEmail',
      accessJwt: 'jwt-2',
      options: { method: 'POST', body: { email: 'me@example.com', token: 'token-123' } },
    });
  });

  it('createAccount includes the invite code when provided', async () => {
    const auth = new TestAuth();
    const session = { accessJwt: 'a', refreshJwt: 'r', handle: 'h', did: 'did:1' };
    auth.responses = [session];

    const result = await auth.createAccount({
      email: 'me@example.com',
      handle: 'me.bsky.social',
      password: 'pw',
      inviteCode: 'invite-1',
    });

    expect(result).toBe(session);
    expect(auth.requestCalls[0]).toEqual({
      endpoint: '/com.atproto.server.createAccount',
      options: {
        method: 'POST',
        body: {
          email: 'me@example.com',
          handle: 'me.bsky.social',
          password: 'pw',
          inviteCode: 'invite-1',
        },
      },
    });
  });

  it('createAccount omits the invite code when not provided', async () => {
    const auth = new TestAuth();
    await auth.createAccount({ email: 'me@example.com', handle: 'me.bsky.social', password: 'pw' });

    expect(auth.requestCalls[0]?.options.body).toEqual({
      email: 'me@example.com',
      handle: 'me.bsky.social',
      password: 'pw',
    });
  });

  it('getServiceAuth sends aud, lxm, and a computed exp param', async () => {
    const auth = new TestAuth();
    auth.responses = [{ token: 'svc-token' }];
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1_000_000);

    const result = await auth.getServiceAuth('jwt-3', 'did:web:video', 'app.bsky.video.getUploadLimits');

    expect(result).toEqual({ token: 'svc-token' });
    const call = auth.authCalls[0];
    expect(call?.endpoint).toBe('/com.atproto.server.getServiceAuth');
    expect(call?.accessJwt).toBe('jwt-3');
    // 1_000_000 / 1000 = 1000, + default 300s = 1300
    expect(call?.options.params).toEqual({
      aud: 'did:web:video',
      lxm: 'app.bsky.video.getUploadLimits',
      exp: '1300',
    });

    nowSpy.mockRestore();
  });

  it('getServiceAuth honors a custom expSeconds', async () => {
    const auth = new TestAuth();
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(2_000_000);

    await auth.getServiceAuth('jwt-4', 'aud', 'lxm', 120);

    // 2_000_000 / 1000 = 2000, + 120 = 2120
    expect(auth.authCalls[0]?.options.params?.exp).toBe('2120');

    nowSpy.mockRestore();
  });

  it('getSession reads the current session', async () => {
    const auth = new TestAuth();
    const info = { handle: 'me.bsky.social', did: 'did:1', email: 'me@example.com' };
    auth.responses = [info];

    const result = await auth.getSession('jwt-5');

    expect(result).toBe(info);
    expect(auth.authCalls[0]).toEqual({
      endpoint: '/com.atproto.server.getSession',
      accessJwt: 'jwt-5',
      options: {},
    });
  });

  it('updateHandle posts the new handle', async () => {
    const auth = new TestAuth();
    await auth.updateHandle('jwt-6', 'new.bsky.social');

    expect(auth.authCalls[0]).toEqual({
      endpoint: '/com.atproto.identity.updateHandle',
      accessJwt: 'jwt-6',
      options: { method: 'POST', body: { handle: 'new.bsky.social' } },
    });
  });

  it('requestEmailUpdate returns tokenRequired', async () => {
    const auth = new TestAuth();
    auth.responses = [{ tokenRequired: true }];

    const result = await auth.requestEmailUpdate('jwt-7');

    expect(result).toEqual({ tokenRequired: true });
    expect(auth.authCalls[0]).toEqual({
      endpoint: '/com.atproto.server.requestEmailUpdate',
      accessJwt: 'jwt-7',
      options: { method: 'POST' },
    });
  });

  it('updateEmail includes the token when provided', async () => {
    const auth = new TestAuth();
    await auth.updateEmail('jwt-8', 'new@example.com', 'token-9');

    expect(auth.authCalls[0]?.options.body).toEqual({ email: 'new@example.com', token: 'token-9' });
  });

  it('updateEmail omits the token when not provided', async () => {
    const auth = new TestAuth();
    await auth.updateEmail('jwt-9', 'new@example.com');

    expect(auth.authCalls[0]?.options.body).toEqual({ email: 'new@example.com' });
  });

  it('requestPasswordReset posts the email unauthenticated', async () => {
    const auth = new TestAuth();
    await auth.requestPasswordReset('me@example.com');

    expect(auth.requestCalls[0]).toEqual({
      endpoint: '/com.atproto.server.requestPasswordReset',
      options: { method: 'POST', body: { email: 'me@example.com' } },
    });
  });

  it('deactivateAccount includes deleteAfter when provided', async () => {
    const auth = new TestAuth();
    await auth.deactivateAccount('jwt-10', '2026-01-01T00:00:00.000Z');

    expect(auth.authCalls[0]?.options.body).toEqual({ deleteAfter: '2026-01-01T00:00:00.000Z' });
  });

  it('deactivateAccount sends an empty body when deleteAfter is omitted', async () => {
    const auth = new TestAuth();
    await auth.deactivateAccount('jwt-11');

    expect(auth.authCalls[0]?.options.body).toEqual({});
  });

  it('requestAccountDelete posts to the auth endpoint', async () => {
    const auth = new TestAuth();
    await auth.requestAccountDelete('jwt-12');

    expect(auth.authCalls[0]).toEqual({
      endpoint: '/com.atproto.server.requestAccountDelete',
      accessJwt: 'jwt-12',
      options: { method: 'POST' },
    });
  });

  it('deleteAccount posts did, password, and token unauthenticated', async () => {
    const auth = new TestAuth();
    await auth.deleteAccount('did:1', 'pw', 'token-13');

    expect(auth.requestCalls[0]).toEqual({
      endpoint: '/com.atproto.server.deleteAccount',
      options: { method: 'POST', body: { did: 'did:1', password: 'pw', token: 'token-13' } },
    });
  });

  it('listAppPasswords reads the app password list', async () => {
    const auth = new TestAuth();
    const list = { passwords: [{ name: 'cli', createdAt: '2026-01-01T00:00:00.000Z' }] };
    auth.responses = [list];

    const result = await auth.listAppPasswords('jwt-14');

    expect(result).toBe(list);
    expect(auth.authCalls[0]).toEqual({
      endpoint: '/com.atproto.server.listAppPasswords',
      accessJwt: 'jwt-14',
      options: {},
    });
  });

  it('createAppPassword posts the name and privileged flag', async () => {
    const auth = new TestAuth();
    const created = { name: 'cli', password: 'secret', createdAt: '2026-01-01T00:00:00.000Z' };
    auth.responses = [created];

    const result = await auth.createAppPassword('jwt-15', 'cli', true);

    expect(result).toBe(created);
    expect(auth.authCalls[0]).toEqual({
      endpoint: '/com.atproto.server.createAppPassword',
      accessJwt: 'jwt-15',
      options: { method: 'POST', body: { name: 'cli', privileged: true } },
    });
  });

  it('createAppPassword defaults privileged to false', async () => {
    const auth = new TestAuth();
    await auth.createAppPassword('jwt-16', 'cli');

    expect(auth.authCalls[0]?.options.body).toEqual({ name: 'cli', privileged: false });
  });

  it('revokeAppPassword posts the name', async () => {
    const auth = new TestAuth();
    await auth.revokeAppPassword('jwt-17', 'cli');

    expect(auth.authCalls[0]).toEqual({
      endpoint: '/com.atproto.server.revokeAppPassword',
      accessJwt: 'jwt-17',
      options: { method: 'POST', body: { name: 'cli' } },
    });
  });

  describe('exportRepo', () => {
    const originalFetch = global.fetch;

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('returns the repo blob on success', async () => {
      const auth = new TestAuth();
      const blob = new Blob(['car-bytes']);
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        blob: async () => blob,
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const result = await auth.exportRepo('jwt-18', 'did:plc:abc');

      expect(result).toBe(blob);
      const [url, init] = fetchMock.mock.calls[0];
      expect(String(url)).toContain('/com.atproto.sync.getRepo');
      expect(String(url)).toContain('did=did%3Aplc%3Aabc');
      expect(init).toEqual({ headers: { Authorization: 'Bearer jwt-18' } });
    });

    it('throws with the status and body text when the response is not ok', async () => {
      const auth = new TestAuth();
      const fetchMock = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'boom',
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      await expect(auth.exportRepo('jwt-19', 'did:plc:def')).rejects.toThrow(
        'Failed to export repo: 500 boom',
      );
    });

    it('tolerates a failing text() read on error', async () => {
      const auth = new TestAuth();
      const fetchMock = jest.fn().mockResolvedValue({
        ok: false,
        status: 502,
        text: async () => {
          throw new Error('no body');
        },
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      await expect(auth.exportRepo('jwt-20', 'did:plc:ghi')).rejects.toThrow(
        'Failed to export repo: 502 ',
      );
    });
  });
});
