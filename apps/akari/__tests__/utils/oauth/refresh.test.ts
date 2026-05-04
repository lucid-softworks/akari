import type { Account } from '@/types/account';

const mockRefreshTokens = jest.fn();
const mockBindOAuthAccount = jest.fn();
const mockUnbindOAuthAccount = jest.fn();

jest.mock('@/utils/oauth/token', () => ({
  refreshTokens: (...args: unknown[]) => mockRefreshTokens(...args),
}));

jest.mock('@/utils/oauth/clientBinding', () => ({
  bindOAuthAccount: (...args: unknown[]) => mockBindOAuthAccount(...args),
  unbindOAuthAccount: (...args: unknown[]) => mockUnbindOAuthAccount(...args),
}));

jest.mock('@/utils/oauth/config', () => ({
  OAUTH_CLIENT_ID: 'https://akari.lucidsoft.works/.well-known/oauth-client.json',
}));

import { refreshOAuthSession } from '@/utils/oauth/refresh';

const baseAccount: Account = {
  did: 'did:plc:abc',
  handle: 'alice.test',
  pdsUrl: 'https://pds.test',
  jwtToken: 'old-access',
  refreshToken: 'old-refresh',
  oauth: {
    dpopPrivateKeyHex: 'aa'.repeat(32),
    dpopPublicJwk: { kty: 'EC', crv: 'P-256', x: 'X', y: 'Y' },
    authServer: {
      issuer: 'https://auth.test',
      token_endpoint: 'https://auth.test/token',
    },
    authServerNonce: 'nonce-old',
    expiresAt: 1_700_000_000,
    scope: 'atproto transition:generic',
  },
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('refreshOAuthSession', () => {
  it('throws when called on a non-OAuth account', async () => {
    await expect(
      refreshOAuthSession({ ...baseAccount, oauth: undefined }),
    ).rejects.toThrow(/non-OAuth account/);
    expect(mockRefreshTokens).not.toHaveBeenCalled();
  });

  it('persists rotated tokens and rebinds the signer to the new access token', async () => {
    mockRefreshTokens.mockResolvedValue({
      tokens: {
        access_token: 'new-access',
        refresh_token: 'new-refresh',
        token_type: 'DPoP',
        scope: 'atproto transition:generic',
        expires_in: 3600,
      },
      nonce: 'nonce-new',
    });

    const before = Math.floor(Date.now() / 1000);
    const refreshed = await refreshOAuthSession(baseAccount);
    const after = Math.floor(Date.now() / 1000);

    expect(mockRefreshTokens).toHaveBeenCalledTimes(1);
    const refreshArgs = mockRefreshTokens.mock.calls[0][0];
    expect(refreshArgs.refreshToken).toBe('old-refresh');
    expect(refreshArgs.nonce).toBe('nonce-old');
    expect(refreshArgs.authServer.token_endpoint).toBe('https://auth.test/token');
    expect(refreshArgs.clientId).toBe(
      'https://akari.lucidsoft.works/.well-known/oauth-client.json',
    );

    expect(refreshed.jwtToken).toBe('new-access');
    expect(refreshed.refreshToken).toBe('new-refresh');
    expect(refreshed.oauth?.authServerNonce).toBe('nonce-new');
    expect(refreshed.oauth?.scope).toBe('atproto transition:generic');
    // expiresAt should be ~now + expires_in (3600).
    expect(refreshed.oauth?.expiresAt).toBeGreaterThanOrEqual(before + 3600);
    expect(refreshed.oauth?.expiresAt).toBeLessThanOrEqual(after + 3600);

    // The DPoP signer must be rekeyed: drop the old token, register the new.
    expect(mockUnbindOAuthAccount).toHaveBeenCalledWith(baseAccount);
    expect(mockBindOAuthAccount).toHaveBeenCalledWith(refreshed);
  });

  it('keeps the previous nonce when the auth server does not return one', async () => {
    mockRefreshTokens.mockResolvedValue({
      tokens: {
        access_token: 'new-access',
        refresh_token: 'new-refresh',
        token_type: 'DPoP',
        scope: 'atproto',
        expires_in: 3600,
      },
      nonce: undefined,
    });

    const refreshed = await refreshOAuthSession(baseAccount);
    expect(refreshed.oauth?.authServerNonce).toBe('nonce-old');
  });

  it('throws when the token endpoint omits a rotated refresh_token', async () => {
    mockRefreshTokens.mockResolvedValue({
      tokens: {
        access_token: 'new-access',
        token_type: 'DPoP',
        scope: 'atproto',
        expires_in: 3600,
      },
      nonce: undefined,
    });

    await expect(refreshOAuthSession(baseAccount)).rejects.toThrow(
      /missing rotated refresh_token/,
    );
    expect(mockBindOAuthAccount).not.toHaveBeenCalled();
    expect(mockUnbindOAuthAccount).not.toHaveBeenCalled();
  });
});
