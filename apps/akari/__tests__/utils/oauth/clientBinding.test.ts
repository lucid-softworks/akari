import type { Account } from '@/types/account';

const mockRegisterDpopSigner = jest.fn();
const mockUnregisterDpopSigner = jest.fn();
const mockSignDpopProof = jest.fn((..._args: unknown[]) => 'signed-proof');
const mockGetItem = jest.fn();

jest.mock('@/bluesky-api', () => ({
  registerDpopSigner: (...args: unknown[]) => mockRegisterDpopSigner(...args),
  unregisterDpopSigner: (...args: unknown[]) => mockUnregisterDpopSigner(...args),
}));

jest.mock('@/utils/secureStorage', () => ({
  storage: {
    getItem: (...args: unknown[]) => mockGetItem(...args),
  },
}));

jest.mock('@/utils/oauth/dpop', () => ({
  signDpopProof: (...args: unknown[]) => mockSignDpopProof(...args),
}));

import {
  bindOAuthAccount,
  restoreOAuthBindingFromStorage,
  unbindOAuthAccount,
} from '@/utils/oauth/clientBinding';

const oauthAccount: Account = {
  did: 'did:plc:abc',
  handle: 'alice.test',
  pdsUrl: 'https://pds.test',
  jwtToken: 'access-token-1',
  refreshToken: 'refresh-1',
  oauth: {
    dpopPrivateKeyHex: 'aa'.repeat(32),
    dpopPublicJwk: { kty: 'EC', crv: 'P-256', x: 'X', y: 'Y' },
    authServer: { issuer: 'https://auth.test', token_endpoint: 'https://auth.test/token' },
    expiresAt: 1_700_000_000,
    scope: 'atproto',
  },
};

const passwordAccount: Account = {
  did: 'did:plc:pw',
  handle: 'bob.test',
  pdsUrl: 'https://pds.test',
  jwtToken: 'bearer-token',
  refreshToken: 'refresh-pw',
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('bindOAuthAccount', () => {
  it('registers a DPoP signer keyed by the access token for OAuth accounts', () => {
    bindOAuthAccount(oauthAccount);
    expect(mockRegisterDpopSigner).toHaveBeenCalledTimes(1);
    const [accessJwt, signer] = mockRegisterDpopSigner.mock.calls[0];
    expect(accessJwt).toBe('access-token-1');
    expect(typeof signer).toBe('function');
  });

  it('is a no-op for handle/app-password accounts', () => {
    bindOAuthAccount(passwordAccount);
    expect(mockRegisterDpopSigner).not.toHaveBeenCalled();
  });

  it('the registered signer delegates to signDpopProof with the account keypair', async () => {
    bindOAuthAccount(oauthAccount);
    const signer = mockRegisterDpopSigner.mock.calls[0][1] as (input: {
      method: string;
      url: string;
      nonce?: string;
    }) => Promise<string>;

    const proof = await signer({
      method: 'POST',
      url: 'https://pds.test/xrpc/foo',
      nonce: 'srv-nonce',
    });

    expect(proof).toBe('signed-proof');
    expect(mockSignDpopProof).toHaveBeenCalledWith({
      keypair: {
        privateKeyHex: 'aa'.repeat(32),
        publicJwk: { kty: 'EC', crv: 'P-256', x: 'X', y: 'Y' },
      },
      htm: 'POST',
      htu: 'https://pds.test/xrpc/foo',
      nonce: 'srv-nonce',
      accessToken: 'access-token-1',
    });
  });
});

describe('unbindOAuthAccount', () => {
  it('unregisters the signer for the account access token', () => {
    unbindOAuthAccount(oauthAccount);
    expect(mockUnregisterDpopSigner).toHaveBeenCalledWith('access-token-1');
  });
});

describe('restoreOAuthBindingFromStorage', () => {
  it('rebinds the persisted current account when it is OAuth-authenticated', () => {
    mockGetItem.mockReturnValue(oauthAccount);
    restoreOAuthBindingFromStorage();
    expect(mockGetItem).toHaveBeenCalledWith('currentAccount');
    expect(mockRegisterDpopSigner).toHaveBeenCalledWith(
      'access-token-1',
      expect.any(Function),
    );
  });

  it('does nothing when the current account is a non-OAuth account', () => {
    mockGetItem.mockReturnValue(passwordAccount);
    restoreOAuthBindingFromStorage();
    expect(mockRegisterDpopSigner).not.toHaveBeenCalled();
  });

  it('does nothing when there is no persisted current account', () => {
    mockGetItem.mockReturnValue(null);
    restoreOAuthBindingFromStorage();
    expect(mockRegisterDpopSigner).not.toHaveBeenCalled();
  });
});
