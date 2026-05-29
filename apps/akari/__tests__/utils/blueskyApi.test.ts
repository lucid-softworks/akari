import type { Account } from '@/types/account';
import type { AppViewConfig } from '@/utils/appView';
import { DEFAULT_APP_VIEW } from '@/utils/appView';

const mockBlueskyApi = jest.fn();
const mockReadAppViewSettings = jest.fn<AppViewConfig, []>();

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: function BlueskyApi(this: unknown, ...args: unknown[]) {
    return mockBlueskyApi(...args);
  },
}));

jest.mock('@/hooks/useAppViewSettings', () => ({
  readAppViewSettings: () => mockReadAppViewSettings(),
}));

import { apiForAccount, apiForPdsUrl, apiForPublicAppView } from '@/utils/blueskyApi';

function makeConfig(overrides: Partial<AppViewConfig> = {}): AppViewConfig {
  return { ...DEFAULT_APP_VIEW, ...overrides };
}

describe('blueskyApi factory helpers', () => {
  beforeEach(() => {
    mockBlueskyApi.mockReset();
    mockReadAppViewSettings.mockReset();
    mockReadAppViewSettings.mockReturnValue(makeConfig());
    // Return a sentinel so we can assert the helper returns the constructed instance.
    mockBlueskyApi.mockImplementation((...args: unknown[]) => ({ args }) as never);
  });

  describe('apiForAccount', () => {
    it('constructs a client at the account pdsUrl with the global default did', () => {
      const account: Pick<Account, 'pdsUrl' | 'appView'> = { pdsUrl: 'https://pds.example.com' };
      const result = apiForAccount(account);

      expect(mockBlueskyApi).toHaveBeenCalledWith('https://pds.example.com', 'did:web:api.bsky.app');
      expect(result).toEqual({ args: ['https://pds.example.com', 'did:web:api.bsky.app'] });
    });

    it('honours a per-account custom AppView override', () => {
      const account: Pick<Account, 'pdsUrl' | 'appView'> = {
        pdsUrl: 'https://pds.example.com',
        appView: {
          preset: 'custom',
          customUrl: 'https://appview.example.com',
          customDid: 'did:web:appview.example.com',
        },
      };
      apiForAccount(account);

      expect(mockBlueskyApi).toHaveBeenCalledWith('https://pds.example.com', 'did:web:appview.example.com');
    });

    it('throws when the account has no pdsUrl', () => {
      const account: Pick<Account, 'pdsUrl' | 'appView'> = {};
      expect(() => apiForAccount(account)).toThrow('apiForAccount: account is missing pdsUrl');
      expect(mockBlueskyApi).not.toHaveBeenCalled();
    });
  });

  describe('apiForPdsUrl', () => {
    it('constructs a client at the given pdsUrl using the global default did', () => {
      const result = apiForPdsUrl('https://other-pds.example.com');

      expect(mockBlueskyApi).toHaveBeenCalledWith('https://other-pds.example.com', 'did:web:api.bsky.app');
      expect(result).toEqual({ args: ['https://other-pds.example.com', 'did:web:api.bsky.app'] });
    });

    it('uses the configured preset did when the global config selects blacksky', () => {
      mockReadAppViewSettings.mockReturnValue(makeConfig({ preset: 'blacksky' }));
      apiForPdsUrl('https://other-pds.example.com');

      expect(mockBlueskyApi).toHaveBeenCalledWith(
        'https://other-pds.example.com',
        'did:web:api.blacksky.community',
      );
    });
  });

  describe('apiForPublicAppView', () => {
    it('constructs a client at the AppView base url with no proxy did', () => {
      const result = apiForPublicAppView();

      expect(mockBlueskyApi).toHaveBeenCalledWith('https://public.api.bsky.app', null);
      expect(result).toEqual({ args: ['https://public.api.bsky.app', null] });
    });

    it('uses the configured preset url when the global config selects blacksky', () => {
      mockReadAppViewSettings.mockReturnValue(makeConfig({ preset: 'blacksky' }));
      apiForPublicAppView();

      expect(mockBlueskyApi).toHaveBeenCalledWith('https://api.blacksky.community', null);
    });
  });
});
