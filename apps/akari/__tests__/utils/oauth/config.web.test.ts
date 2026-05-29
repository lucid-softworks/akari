// Covers the Platform.OS === 'web' branch of config.ts. The global jest
// setup pins Platform.OS to 'ios', so we override it here and re-import the
// module in isolation.

jest.mock('@/scripts/lib/oauth-scope-data', () => ({
  flatScopes: [],
  repoScopes: [],
  buildFullScopeString: () => '',
}));

describe('config constants (web platform)', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('uses the web client metadata URL and HTTPS redirect on web', () => {
    jest.doMock('react-native', () => ({ Platform: { OS: 'web' } }));

    let mod: typeof import('@/utils/oauth/config');
    jest.isolateModules(() => {
      mod = require('@/utils/oauth/config');
    });

    expect(mod!.OAUTH_CLIENT_ID).toBe(
      'https://akari.lucidsoft.works/.well-known/oauth-client-web.json',
    );
    expect(mod!.OAUTH_REDIRECT_URI).toBe(
      'https://akari.lucidsoft.works/oauth/callback',
    );
  });
});
