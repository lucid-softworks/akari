jest.mock('@/utils/secureStorage', () => ({
  storage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

import { registerOrLoadApp } from '@/utils/mastodon/app';
import { storage } from '@/utils/secureStorage';

const getItem = storage.getItem as jest.Mock;
const setItem = storage.setItem as jest.Mock;

const REDIRECT = 'https://akari.lucidsoft.works/oauth/mastodon';
const SCOPE = 'read write follow push';

describe('registerOrLoadApp', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    getItem.mockReset();
    setItem.mockReset();
  });

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

  it('reuses a cached client when redirect and scope match', async () => {
    const cached = {
      'https://mastodon.social': {
        instanceUrl: 'https://mastodon.social',
        redirectUri: REDIRECT,
        scope: SCOPE,
        clientId: 'cached-id',
        clientSecret: 'cached-secret',
      },
    };
    getItem.mockReturnValue(cached);
    global.fetch = jest.fn() as unknown as typeof fetch;

    const creds = await registerOrLoadApp('https://mastodon.social', REDIRECT, SCOPE);

    expect(creds.clientId).toBe('cached-id');
    expect(global.fetch).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
  });

  it('registers a new client on a cache miss and persists it', async () => {
    getItem.mockReturnValue(null);
    mockFetch({ client_id: 'new-id', client_secret: 'new-secret' });

    const creds = await registerOrLoadApp('https://mastodon.social', REDIRECT, SCOPE);

    expect(global.fetch).toHaveBeenCalledWith(
      'https://mastodon.social/api/v1/apps',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(creds).toEqual({
      instanceUrl: 'https://mastodon.social',
      redirectUri: REDIRECT,
      scope: SCOPE,
      clientId: 'new-id',
      clientSecret: 'new-secret',
    });
    expect(setItem).toHaveBeenCalledWith(
      'mastodonApps',
      expect.objectContaining({ 'https://mastodon.social': creds }),
    );
  });

  it('re-registers when the cached redirect URI no longer matches', async () => {
    getItem.mockReturnValue({
      'https://mastodon.social': {
        instanceUrl: 'https://mastodon.social',
        redirectUri: 'https://old.example/oauth/mastodon',
        scope: SCOPE,
        clientId: 'stale-id',
        clientSecret: 'stale-secret',
      },
    });
    mockFetch({ client_id: 'fresh-id', client_secret: 'fresh-secret' });

    const creds = await registerOrLoadApp('https://mastodon.social', REDIRECT, SCOPE);

    expect(global.fetch).toHaveBeenCalled();
    expect(creds.clientId).toBe('fresh-id');
  });

  it('throws on a non-ok registration response', async () => {
    getItem.mockReturnValue(null);
    mockFetch(null, false, 500);
    await expect(registerOrLoadApp('https://mastodon.social', REDIRECT, SCOPE)).rejects.toThrow(
      /failed/,
    );
  });

  it('throws when the registration body is incomplete', async () => {
    getItem.mockReturnValue(null);
    mockFetch({ client_id: 'id-only' });
    await expect(registerOrLoadApp('https://mastodon.social', REDIRECT, SCOPE)).rejects.toThrow(
      /incomplete/,
    );
  });
});
