import type { DpopKeypair } from '@/utils/oauth/dpop';
import type { AuthorizationServerMetadata } from '@/utils/oauth/discovery';

const mockDpopFetch = jest.fn();

jest.mock('@/utils/oauth/dpopFetch', () => ({
  dpopFetch: (...args: unknown[]) => mockDpopFetch(...args),
}));

import {
  exchangeCodeForTokens,
  refreshTokens,
  type ExchangeCodeInput,
  type RefreshTokenInput,
} from '@/utils/oauth/token';

const authServer: AuthorizationServerMetadata = {
  issuer: 'https://auth.test',
  authorization_endpoint: 'https://auth.test/authorize',
  token_endpoint: 'https://auth.test/token',
  pushed_authorization_request_endpoint: 'https://auth.test/par',
};

const keypair: DpopKeypair = {
  privateKeyHex: 'aa'.repeat(32),
  publicJwk: { kty: 'EC', crv: 'P-256', x: 'X', y: 'Y' },
};

const okTokens = {
  access_token: 'access-1',
  refresh_token: 'refresh-1',
  token_type: 'DPoP' as const,
  scope: 'atproto',
  expires_in: 3600,
  sub: 'did:plc:abc',
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('exchangeCodeForTokens', () => {
  const input: ExchangeCodeInput = {
    authServer,
    clientId: 'client-1',
    redirectUri: 'app:/cb',
    code: 'auth-code',
    codeVerifier: 'verifier-1',
    keypair,
    nonce: 'in-nonce',
  };

  it('POSTs the authorization_code grant and returns tokens + nonce', async () => {
    mockDpopFetch.mockResolvedValue({
      response: { ok: true, status: 200 },
      body: okTokens,
      nonce: 'out-nonce',
    });

    const result = await exchangeCodeForTokens(input);
    expect(result).toEqual({ tokens: okTokens, nonce: 'out-nonce' });

    const [url, init] = mockDpopFetch.mock.calls[0];
    expect(url).toBe('https://auth.test/token');
    expect(init.method).toBe('POST');
    expect(init.keypair).toBe(keypair);
    expect(init.nonce).toBe('in-nonce');
    expect(init.body).toEqual({
      grant_type: 'authorization_code',
      client_id: 'client-1',
      redirect_uri: 'app:/cb',
      code: 'auth-code',
      code_verifier: 'verifier-1',
    });
  });

  it('throws with error_description on failure', async () => {
    mockDpopFetch.mockResolvedValue({
      response: { ok: false, status: 400 },
      body: { error: 'invalid_grant', error_description: 'expired code' },
    });
    await expect(exchangeCodeForTokens(input)).rejects.toThrow(
      'token exchange failed: expired code',
    );
  });

  it('falls back to error code then HTTP status', async () => {
    mockDpopFetch.mockResolvedValue({
      response: { ok: false, status: 400 },
      body: { error: 'invalid_grant' },
    });
    await expect(exchangeCodeForTokens(input)).rejects.toThrow(
      'token exchange failed: invalid_grant',
    );

    mockDpopFetch.mockResolvedValue({
      response: { ok: false, status: 500 },
      body: null,
    });
    await expect(exchangeCodeForTokens(input)).rejects.toThrow(
      'token exchange failed: HTTP 500',
    );
  });

  it('throws when ok but access_token is missing', async () => {
    mockDpopFetch.mockResolvedValue({
      response: { ok: true, status: 200 },
      body: { scope: 'atproto' },
    });
    await expect(exchangeCodeForTokens(input)).rejects.toThrow(
      'token exchange failed: HTTP 200',
    );
  });
});

describe('refreshTokens', () => {
  const input: RefreshTokenInput = {
    authServer,
    clientId: 'client-1',
    refreshToken: 'old-refresh',
    keypair,
    nonce: 'in-nonce',
  };

  it('POSTs the refresh_token grant and returns tokens + nonce', async () => {
    mockDpopFetch.mockResolvedValue({
      response: { ok: true, status: 200 },
      body: okTokens,
      nonce: 'out-nonce',
    });

    const result = await refreshTokens(input);
    expect(result).toEqual({ tokens: okTokens, nonce: 'out-nonce' });

    const [url, init] = mockDpopFetch.mock.calls[0];
    expect(url).toBe('https://auth.test/token');
    expect(init.body).toEqual({
      grant_type: 'refresh_token',
      client_id: 'client-1',
      refresh_token: 'old-refresh',
    });
    expect(init.nonce).toBe('in-nonce');
  });

  it('throws an error carrying status + oauthError on a dead refresh token', async () => {
    mockDpopFetch.mockResolvedValue({
      response: { ok: false, status: 400 },
      body: { error: 'invalid_grant', error_description: 'token revoked' },
    });

    await expect(refreshTokens(input)).rejects.toMatchObject({
      message: 'token refresh failed: token revoked',
      status: 400,
      oauthError: 'invalid_grant',
    });
  });

  it('annotates the error for transient 5xx failures (no oauthError)', async () => {
    mockDpopFetch.mockResolvedValue({
      response: { ok: false, status: 503 },
      body: null,
    });

    const err = (await refreshTokens(input).catch((e: unknown) => e)) as Error & {
      status?: number;
      oauthError?: string;
    };
    expect(err.message).toBe('token refresh failed: HTTP 503');
    expect(err.status).toBe(503);
    expect(err.oauthError).toBeUndefined();
  });

  it('throws when ok but access_token is missing', async () => {
    mockDpopFetch.mockResolvedValue({
      response: { ok: true, status: 200 },
      body: { scope: 'atproto' },
    });
    await expect(refreshTokens(input)).rejects.toThrow(
      'token refresh failed: HTTP 200',
    );
  });
});
