import { buildMastodonAccount } from '@/utils/mastodon/account';

const app = {
  instanceUrl: 'https://mastodon.social',
  redirectUri: 'https://akari.lucidsoft.works/oauth/mastodon',
  scope: 'read write follow push',
  clientId: 'client-123',
  clientSecret: 'secret-456',
};

const token = {
  access_token: 'access-789',
  token_type: 'Bearer',
  scope: 'read write follow push',
  created_at: 1_700_000_000,
};

const credentials = {
  id: '42',
  username: 'alice',
  acct: 'alice',
  display_name: 'Alice',
  avatar: 'https://cdn.example/alice.png',
  header: 'https://cdn.example/alice-header.png',
  note: '',
  url: 'https://mastodon.social/@alice',
  discoverable: null,
};

describe('buildMastodonAccount', () => {
  it('uses the canonical profile URL as the cross-protocol account key', () => {
    const account = buildMastodonAccount({ instanceUrl: 'https://mastodon.social', app, token, credentials });
    expect(account.did).toBe('https://mastodon.social/@alice');
  });

  it('renders the handle as user@instance', () => {
    const account = buildMastodonAccount({ instanceUrl: 'https://mastodon.social', app, token, credentials });
    expect(account.handle).toBe('alice@mastodon.social');
  });

  it('marks the provider and carries the mastodon auth blob', () => {
    const account = buildMastodonAccount({ instanceUrl: 'https://mastodon.social', app, token, credentials });
    expect(account.provider).toBe('mastodon');
    expect(account.mastodon).toEqual({
      instanceUrl: 'https://mastodon.social',
      accountId: '42',
      clientId: 'client-123',
      clientSecret: 'secret-456',
      scope: 'read write follow push',
      tokenType: 'Bearer',
    });
  });

  it('stores the access token as jwtToken with no refresh token', () => {
    const account = buildMastodonAccount({ instanceUrl: 'https://mastodon.social', app, token, credentials });
    expect(account.jwtToken).toBe('access-789');
    expect(account.refreshToken).toBe('');
  });

  it('omits an empty display name', () => {
    const account = buildMastodonAccount({
      instanceUrl: 'https://mastodon.social',
      app,
      token,
      credentials: { ...credentials, display_name: '' },
    });
    expect(account.displayName).toBeUndefined();
  });

  it('falls back to the app scope and Bearer when the token omits them', () => {
    const account = buildMastodonAccount({
      instanceUrl: 'https://mastodon.social',
      app,
      token: { ...token, scope: '', token_type: '' },
      credentials,
    });
    expect(account.mastodon?.scope).toBe('read write follow push');
    expect(account.mastodon?.tokenType).toBe('Bearer');
  });
});
