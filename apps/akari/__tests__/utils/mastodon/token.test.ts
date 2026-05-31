import { exchangeMastodonCode, verifyMastodonCredentials } from '@/utils/mastodon/token';

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  jest.restoreAllMocks();
});

function mockFetch(payload: unknown, ok = true, status = 200) {
  global.fetch = jest.fn().mockResolvedValue({
    ok,
    status,
    json: async () => payload,
  }) as unknown as typeof fetch;
}

describe('exchangeMastodonCode', () => {
  const input = {
    instanceUrl: 'https://mastodon.social',
    clientId: 'client-1',
    clientSecret: 'secret-1',
    redirectUri: 'https://akari.lucidsoft.works/oauth/mastodon',
    code: 'auth-code',
    scope: 'read write follow push',
  };

  it('posts to the token endpoint and returns the token response', async () => {
    mockFetch({
      access_token: 'tok',
      token_type: 'Bearer',
      scope: 'read write follow push',
      created_at: 1_700_000_000,
    });

    const token = await exchangeMastodonCode(input);

    expect(global.fetch).toHaveBeenCalledWith(
      'https://mastodon.social/oauth/token',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(token.access_token).toBe('tok');
  });

  it('surfaces the OAuth error description on failure', async () => {
    mockFetch({ error: 'invalid_grant', error_description: 'bad code' }, false, 400);
    await expect(exchangeMastodonCode(input)).rejects.toThrow(/bad code/);
  });

  it('throws when no access token is returned', async () => {
    mockFetch({ token_type: 'Bearer' });
    await expect(exchangeMastodonCode(input)).rejects.toThrow(/token exchange failed/);
  });
});

describe('verifyMastodonCredentials', () => {
  it('sends the bearer token and returns the credential account', async () => {
    mockFetch({
      id: '7',
      username: 'bob',
      acct: 'bob',
      display_name: 'Bob',
      avatar: 'https://cdn/bob.png',
      url: 'https://mastodon.social/@bob',
    });

    const cred = await verifyMastodonCredentials('https://mastodon.social', 'tok');

    expect(global.fetch).toHaveBeenCalledWith(
      'https://mastodon.social/api/v1/accounts/verify_credentials',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer tok' }),
      }),
    );
    expect(cred.url).toBe('https://mastodon.social/@bob');
  });

  it('throws on a non-ok response', async () => {
    mockFetch(null, false, 401);
    await expect(verifyMastodonCredentials('https://mastodon.social', 'tok')).rejects.toThrow(
      /profile failed/,
    );
  });

  it('throws when the profile is missing identity fields', async () => {
    mockFetch({ username: 'bob' });
    await expect(verifyMastodonCredentials('https://mastodon.social', 'tok')).rejects.toThrow(
      /incomplete profile/,
    );
  });
});
