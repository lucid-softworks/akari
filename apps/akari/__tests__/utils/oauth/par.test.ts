import type { DpopKeypair } from '@/utils/oauth/dpop';
import type { AuthorizationServerMetadata } from '@/utils/oauth/discovery';

const mockDpopFetch = jest.fn();

jest.mock('@/utils/oauth/dpopFetch', () => ({
  dpopFetch: (...args: unknown[]) => mockDpopFetch(...args),
}));

import {
  pushAuthorizationRequest,
  type PushedAuthorizationRequestInput,
} from '@/utils/oauth/par';

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

const baseInput: PushedAuthorizationRequestInput = {
  authServer,
  clientId: 'https://client.test/meta.json',
  redirectUri: 'app:/cb',
  scope: 'atproto transition:generic',
  state: 'state-123',
  codeChallenge: 'challenge-abc',
  keypair,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('pushAuthorizationRequest', () => {
  it('POSTs the PAR params to the PAR endpoint and returns request_uri + expiry', async () => {
    mockDpopFetch.mockResolvedValue({
      response: { ok: true, status: 201 },
      body: { request_uri: 'urn:req:abc', expires_in: 90 },
      nonce: 'srv-nonce',
    });

    const result = await pushAuthorizationRequest(baseInput);

    expect(result).toEqual({
      requestUri: 'urn:req:abc',
      expiresIn: 90,
      nonce: 'srv-nonce',
    });

    expect(mockDpopFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockDpopFetch.mock.calls[0];
    expect(url).toBe('https://auth.test/par');
    expect(init.method).toBe('POST');
    expect(init.keypair).toBe(keypair);
    expect(init.body).toEqual({
      client_id: 'https://client.test/meta.json',
      response_type: 'code',
      redirect_uri: 'app:/cb',
      scope: 'atproto transition:generic',
      state: 'state-123',
      code_challenge: 'challenge-abc',
      code_challenge_method: 'S256',
    });
  });

  it('omits login_hint when no handle is supplied', async () => {
    mockDpopFetch.mockResolvedValue({
      response: { ok: true, status: 201 },
      body: { request_uri: 'urn:req:abc', expires_in: 90 },
    });
    await pushAuthorizationRequest(baseInput);
    expect(mockDpopFetch.mock.calls[0][1].body.login_hint).toBeUndefined();
  });

  it('includes login_hint when a handle is supplied', async () => {
    mockDpopFetch.mockResolvedValue({
      response: { ok: true, status: 201 },
      body: { request_uri: 'urn:req:abc', expires_in: 90 },
    });
    await pushAuthorizationRequest({ ...baseInput, loginHint: 'alice.test' });
    expect(mockDpopFetch.mock.calls[0][1].body.login_hint).toBe('alice.test');
  });

  it('throws with the server error_description when present', async () => {
    mockDpopFetch.mockResolvedValue({
      response: { ok: false, status: 400 },
      body: { error: 'invalid_request', error_description: 'bad scope' },
    });
    await expect(pushAuthorizationRequest(baseInput)).rejects.toThrow(
      'PAR failed: bad scope',
    );
  });

  it('falls back to the error code when no description is present', async () => {
    mockDpopFetch.mockResolvedValue({
      response: { ok: false, status: 400 },
      body: { error: 'invalid_request' },
    });
    await expect(pushAuthorizationRequest(baseInput)).rejects.toThrow(
      'PAR failed: invalid_request',
    );
  });

  it('falls back to the HTTP status when the body has no error fields', async () => {
    mockDpopFetch.mockResolvedValue({
      response: { ok: false, status: 503 },
      body: null,
    });
    await expect(pushAuthorizationRequest(baseInput)).rejects.toThrow(
      'PAR failed: HTTP 503',
    );
  });

  it('throws when the response is ok but request_uri is missing', async () => {
    mockDpopFetch.mockResolvedValue({
      response: { ok: true, status: 200 },
      body: { expires_in: 90 },
    });
    await expect(pushAuthorizationRequest(baseInput)).rejects.toThrow(
      'PAR failed: HTTP 200',
    );
  });
});
