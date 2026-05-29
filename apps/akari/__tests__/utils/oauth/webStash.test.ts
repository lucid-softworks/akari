import {
  clearOAuthFlow,
  readOAuthFlow,
  stashOAuthFlow,
  type StashedOAuthFlow,
} from '@/utils/oauth/webStash';

const STASH_KEY = 'akari.oauth.in-flight.v1';

const sampleFlow: StashedOAuthFlow = {
  state: 'state-123',
  codeVerifier: 'verifier-abc',
  parNonce: 'nonce-xyz',
  scope: 'atproto transition:generic',
  identity: { did: 'did:plc:abc', handle: 'alice.test', pdsUrl: 'https://pds.test' },
  authServer: {
    issuer: 'https://auth.test',
    authorization_endpoint: 'https://auth.test/authorize',
    token_endpoint: 'https://auth.test/token',
    pushed_authorization_request_endpoint: 'https://auth.test/par',
  },
  keypair: {
    privateKeyHex: 'aa'.repeat(32),
    publicJwk: { kty: 'EC', crv: 'P-256', x: 'X', y: 'Y' },
  },
};

function makeMemoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: jest.fn((k: string) => (map.has(k) ? map.get(k)! : null)),
    setItem: jest.fn((k: string, v: string) => {
      map.set(k, v);
    }),
    removeItem: jest.fn((k: string) => {
      map.delete(k);
    }),
    _map: map,
  };
}

describe('webStash with sessionStorage available', () => {
  let storage: ReturnType<typeof makeMemoryStorage>;
  let originalWindow: unknown;

  beforeEach(() => {
    storage = makeMemoryStorage();
    originalWindow = (globalThis as { window?: unknown }).window;
    (globalThis as { window?: unknown }).window = {
      sessionStorage: storage,
    };
  });

  afterEach(() => {
    (globalThis as { window?: unknown }).window = originalWindow;
  });

  it('stashOAuthFlow serializes the flow into sessionStorage', () => {
    stashOAuthFlow(sampleFlow);
    expect(storage.setItem).toHaveBeenCalledWith(
      STASH_KEY,
      JSON.stringify(sampleFlow),
    );
  });

  it('readOAuthFlow round-trips a stashed flow', () => {
    stashOAuthFlow(sampleFlow);
    expect(readOAuthFlow()).toEqual(sampleFlow);
  });

  it('readOAuthFlow returns null when nothing is stashed', () => {
    expect(readOAuthFlow()).toBeNull();
  });

  it('readOAuthFlow returns null on malformed JSON', () => {
    storage._map.set(STASH_KEY, '{not valid json');
    expect(readOAuthFlow()).toBeNull();
  });

  it('clearOAuthFlow removes the stash entry', () => {
    stashOAuthFlow(sampleFlow);
    clearOAuthFlow();
    expect(storage.removeItem).toHaveBeenCalledWith(STASH_KEY);
    expect(readOAuthFlow()).toBeNull();
  });
});

describe('webStash without window (native)', () => {
  let originalWindow: unknown;

  beforeEach(() => {
    originalWindow = (globalThis as { window?: unknown }).window;
    delete (globalThis as { window?: unknown }).window;
  });

  afterEach(() => {
    (globalThis as { window?: unknown }).window = originalWindow;
  });

  it('stashOAuthFlow is a no-op', () => {
    expect(() => stashOAuthFlow(sampleFlow)).not.toThrow();
  });

  it('readOAuthFlow returns null', () => {
    expect(readOAuthFlow()).toBeNull();
  });

  it('clearOAuthFlow is a no-op', () => {
    expect(() => clearOAuthFlow()).not.toThrow();
  });
});

describe('webStash with window but no sessionStorage', () => {
  let originalWindow: unknown;

  beforeEach(() => {
    originalWindow = (globalThis as { window?: unknown }).window;
    (globalThis as { window?: unknown }).window = {};
  });

  afterEach(() => {
    (globalThis as { window?: unknown }).window = originalWindow;
  });

  it('readOAuthFlow returns null when sessionStorage is undefined', () => {
    expect(readOAuthFlow()).toBeNull();
  });
});
