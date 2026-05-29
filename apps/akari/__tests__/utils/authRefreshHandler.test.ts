import { QueryClient } from '@tanstack/react-query';

import type { Account } from '@/types/account';

const mockSetAuthRefreshHandler = jest.fn();
const mockRefreshOAuthSession = jest.fn();
const mockApiForAccount = jest.fn();
const mockStorageGet = jest.fn();
const mockStorageSet = jest.fn();
const mockStorageRemove = jest.fn();

jest.mock('@/bluesky-api', () => ({
  setAuthRefreshHandler: (...args: unknown[]) => mockSetAuthRefreshHandler(...args),
}));

jest.mock('@/utils/oauth/refresh', () => ({
  refreshOAuthSession: (...args: unknown[]) => mockRefreshOAuthSession(...args),
}));

jest.mock('@/utils/blueskyApi', () => ({
  apiForAccount: (...args: unknown[]) => mockApiForAccount(...args),
}));

jest.mock('@/utils/secureStorage', () => ({
  storage: {
    getItem: (...args: unknown[]) => mockStorageGet(...args),
    setItem: (...args: unknown[]) => mockStorageSet(...args),
    removeItem: (...args: unknown[]) => mockStorageRemove(...args),
  },
}));

import { installAuthRefreshHandler } from '@/utils/authRefreshHandler';

type RefreshHandler = (oldAccessJwt: string) => Promise<string | null>;

const oauthAccount: Account = {
  did: 'did:plc:oauth-user',
  handle: 'oauth.test',
  pdsUrl: 'https://pds.example',
  jwtToken: 'oauth-old',
  refreshToken: 'oauth-refresh',
  oauth: {
    dpopPrivateKeyHex: 'aa'.repeat(32),
    dpopPublicJwk: { kty: 'EC', crv: 'P-256', x: 'X', y: 'Y' },
    authServer: { issuer: 'https://auth.test', token_endpoint: 'https://auth.test/token' },
    expiresAt: 1700000000,
    scope: 'atproto',
  },
};

const bearerAccount: Account = {
  did: 'did:plc:bearer-user',
  handle: 'bearer.test',
  pdsUrl: 'https://pds.example',
  jwtToken: 'bearer-old',
  refreshToken: 'bearer-refresh',
};

function setCurrentAccount(qc: QueryClient, account: Account | null) {
  qc.setQueryData(['currentAccount'], account);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('installAuthRefreshHandler', () => {
  it('returns null when no account matches the access token', async () => {
    const qc = new QueryClient();
    installAuthRefreshHandler(qc);
    const handler = mockSetAuthRefreshHandler.mock.calls[0][0] as RefreshHandler;

    mockStorageGet.mockReturnValue(null);

    await expect(handler('unknown-token')).resolves.toBeNull();
    expect(mockRefreshOAuthSession).not.toHaveBeenCalled();
    expect(mockApiForAccount).not.toHaveBeenCalled();
  });

  it('refreshes an OAuth account and persists rotated tokens to react-query and storage', async () => {
    const qc = new QueryClient();
    installAuthRefreshHandler(qc);
    const handler = mockSetAuthRefreshHandler.mock.calls[0][0] as RefreshHandler;

    setCurrentAccount(qc, oauthAccount);
    qc.setQueryData(['accounts'], [oauthAccount]);

    const refreshedOAuth: Account = {
      ...oauthAccount,
      jwtToken: 'oauth-new',
      refreshToken: 'oauth-refresh-new',
    };
    mockRefreshOAuthSession.mockResolvedValueOnce(refreshedOAuth);

    const newToken = await handler('oauth-old');

    expect(newToken).toBe('oauth-new');
    expect(mockRefreshOAuthSession).toHaveBeenCalledWith(oauthAccount);
    expect(qc.getQueryData(['jwtToken'])).toBe('oauth-new');
    expect(qc.getQueryData(['refreshToken'])).toBe('oauth-refresh-new');
    expect(qc.getQueryData(['currentAccount'])).toEqual(refreshedOAuth);
    expect(qc.getQueryData<Account[]>(['accounts'])).toEqual([refreshedOAuth]);
    expect(mockStorageSet).toHaveBeenCalledWith('jwtToken', 'oauth-new');
    expect(mockStorageSet).toHaveBeenCalledWith('refreshToken', 'oauth-refresh-new');
    expect(mockStorageSet).toHaveBeenCalledWith('currentAccount', refreshedOAuth);
    expect(mockStorageSet).toHaveBeenCalledWith('accounts', [refreshedOAuth]);
  });

  it('refreshes a Bearer (handle/app-password) account via refreshSession', async () => {
    const qc = new QueryClient();
    installAuthRefreshHandler(qc);
    const handler = mockSetAuthRefreshHandler.mock.calls[0][0] as RefreshHandler;

    setCurrentAccount(qc, bearerAccount);
    qc.setQueryData(['accounts'], [bearerAccount]);

    const refreshSession = jest.fn().mockResolvedValue({
      did: bearerAccount.did,
      handle: bearerAccount.handle,
      accessJwt: 'bearer-new',
      refreshJwt: 'bearer-refresh-new',
    });
    mockApiForAccount.mockReturnValue({ refreshSession });

    const newToken = await handler('bearer-old');

    expect(newToken).toBe('bearer-new');
    expect(refreshSession).toHaveBeenCalledWith('bearer-refresh');
    expect(qc.getQueryData(['jwtToken'])).toBe('bearer-new');
    expect(qc.getQueryData(['refreshToken'])).toBe('bearer-refresh-new');
    const cached = qc.getQueryData<Account>(['currentAccount']);
    expect(cached?.jwtToken).toBe('bearer-new');
    expect(cached?.refreshToken).toBe('bearer-refresh-new');
  });

  it('clears auth and returns null when refresh itself fails', async () => {
    const qc = new QueryClient();
    installAuthRefreshHandler(qc);
    const handler = mockSetAuthRefreshHandler.mock.calls[0][0] as RefreshHandler;

    setCurrentAccount(qc, oauthAccount);
    qc.setQueryData(['accounts'], [oauthAccount]);

    // A definitively dead session (the OAuth auth server reports the refresh
    // token was revoked / already rotated) is what triggers clearing auth. A
    // bare Error with no status/oauthError is treated as transient and would
    // (correctly) leave the session intact.
    mockRefreshOAuthSession.mockRejectedValueOnce(
      Object.assign(new Error('refresh token revoked'), { oauthError: 'invalid_grant' }),
    );

    // Silence the __DEV__ console.warn the handler emits on failure so the
    // test output stays clean.
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await handler('oauth-old');

    expect(result).toBeNull();
    expect(qc.getQueryData(['jwtToken'])).toBeNull();
    expect(qc.getQueryData(['refreshToken'])).toBeNull();
    expect(qc.getQueryData(['currentAccount'])).toBeNull();
    expect(mockStorageRemove).toHaveBeenCalledWith('jwtToken');
    expect(mockStorageRemove).toHaveBeenCalledWith('refreshToken');
    expect(mockStorageRemove).toHaveBeenCalledWith('currentAccount');

    warnSpy.mockRestore();
  });

  it('deduplicates concurrent refreshes for the same access token', async () => {
    const qc = new QueryClient();
    installAuthRefreshHandler(qc);
    const handler = mockSetAuthRefreshHandler.mock.calls[0][0] as RefreshHandler;

    setCurrentAccount(qc, oauthAccount);
    qc.setQueryData(['accounts'], [oauthAccount]);

    let resolveRefresh!: (value: Account) => void;
    mockRefreshOAuthSession.mockImplementation(
      () =>
        new Promise<Account>((resolve) => {
          resolveRefresh = resolve;
        }),
    );

    const a = handler('oauth-old');
    const b = handler('oauth-old');
    const c = handler('oauth-old');

    expect(mockRefreshOAuthSession).toHaveBeenCalledTimes(1);

    resolveRefresh({ ...oauthAccount, jwtToken: 'rotated' });

    await expect(Promise.all([a, b, c])).resolves.toEqual(['rotated', 'rotated', 'rotated']);
    expect(mockRefreshOAuthSession).toHaveBeenCalledTimes(1);
  });

  it('falls back to storage when react-query cache has not seeded the account yet', async () => {
    const qc = new QueryClient();
    installAuthRefreshHandler(qc);
    const handler = mockSetAuthRefreshHandler.mock.calls[0][0] as RefreshHandler;

    // Cache empty; storage holds the only copy.
    mockStorageGet.mockImplementation((key: string) => {
      if (key === 'currentAccount') return oauthAccount;
      if (key === 'accounts') return [oauthAccount];
      return null;
    });

    mockRefreshOAuthSession.mockResolvedValueOnce({ ...oauthAccount, jwtToken: 'rotated' });

    await expect(handler('oauth-old')).resolves.toBe('rotated');
    expect(mockRefreshOAuthSession).toHaveBeenCalledWith(oauthAccount);
  });

  it('returns null without refreshing a bearer account that lacks pdsUrl or refreshToken', async () => {
    const qc = new QueryClient();
    installAuthRefreshHandler(qc);
    const handler = mockSetAuthRefreshHandler.mock.calls[0][0] as RefreshHandler;

    setCurrentAccount(qc, { ...bearerAccount, refreshToken: '' });

    await expect(handler('bearer-old')).resolves.toBeNull();
    expect(mockApiForAccount).not.toHaveBeenCalled();
  });
});
