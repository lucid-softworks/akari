import type { Account } from '@/types/account';
import {
  APP_VIEW_PRESETS,
  AppViewRequiredError,
  type AppViewConfig,
  DEFAULT_APP_VIEW,
  isAppViewEnabled,
  isAppViewRequiredError,
  resolveAccountAppView,
  resolveAppView,
  resolveCdnHost,
} from '@/utils/appView';

function makeConfig(overrides: Partial<AppViewConfig> = {}): AppViewConfig {
  return { ...DEFAULT_APP_VIEW, ...overrides };
}

describe('DEFAULT_APP_VIEW', () => {
  it('defaults to the bsky preset with the AppView enabled', () => {
    expect(DEFAULT_APP_VIEW).toEqual({ preset: 'bsky', cdnPreset: 'bsky', appViewEnabled: true });
  });
});

describe('isAppViewEnabled', () => {
  it('returns true when explicitly enabled', () => {
    expect(isAppViewEnabled(makeConfig({ appViewEnabled: true }))).toBe(true);
  });

  it('returns false only when explicitly disabled', () => {
    expect(isAppViewEnabled(makeConfig({ appViewEnabled: false }))).toBe(false);
  });

  it('treats a legacy config without the flag as enabled', () => {
    const legacy = { preset: 'bsky', cdnPreset: 'bsky' } as unknown as AppViewConfig;
    expect(isAppViewEnabled(legacy)).toBe(true);
  });
});

describe('AppViewRequiredError', () => {
  it('carries the feature key, code, name, and message', () => {
    const err = new AppViewRequiredError('timeline');
    expect(err).toBeInstanceOf(Error);
    expect(err.code).toBe('APP_VIEW_REQUIRED');
    expect(err.featureKey).toBe('timeline');
    expect(err.name).toBe('AppViewRequiredError');
    expect(err.message).toBe('Feature requires an AppView: timeline');
  });
});

describe('isAppViewRequiredError', () => {
  it('detects AppViewRequiredError instances', () => {
    expect(isAppViewRequiredError(new AppViewRequiredError('search'))).toBe(true);
  });

  it('detects any error carrying the APP_VIEW_REQUIRED code', () => {
    const err = Object.assign(new Error('nope'), { code: 'APP_VIEW_REQUIRED' });
    expect(isAppViewRequiredError(err)).toBe(true);
  });

  it('rejects plain errors and non-error values', () => {
    expect(isAppViewRequiredError(new Error('boom'))).toBe(false);
    expect(isAppViewRequiredError({ code: 'APP_VIEW_REQUIRED' })).toBe(false);
    expect(isAppViewRequiredError(null)).toBe(false);
    expect(isAppViewRequiredError(undefined)).toBe(false);
    expect(isAppViewRequiredError('APP_VIEW_REQUIRED')).toBe(false);
  });
});

describe('resolveCdnHost', () => {
  it('returns undefined for the default bsky preset', () => {
    expect(resolveCdnHost(makeConfig({ cdnPreset: 'bsky' }))).toBeUndefined();
  });

  it('returns the blueat mirror host', () => {
    expect(resolveCdnHost(makeConfig({ cdnPreset: 'blueat' }))).toBe('https://cdn.blueat.net');
  });

  it('normalizes a custom CDN url (trims trailing slashes)', () => {
    expect(resolveCdnHost(makeConfig({ cdnPreset: 'custom', customCdnUrl: 'https://cdn.example.com///' }))).toBe(
      'https://cdn.example.com',
    );
  });

  it('returns undefined for a missing custom CDN url', () => {
    expect(resolveCdnHost(makeConfig({ cdnPreset: 'custom', customCdnUrl: undefined }))).toBeUndefined();
  });

  it('returns undefined for a blank custom CDN url', () => {
    expect(resolveCdnHost(makeConfig({ cdnPreset: 'custom', customCdnUrl: '   ' }))).toBeUndefined();
  });

  it('returns undefined for a non-http custom CDN url', () => {
    expect(resolveCdnHost(makeConfig({ cdnPreset: 'custom', customCdnUrl: 'ftp://cdn.example.com' }))).toBeUndefined();
  });

  it('trims surrounding whitespace from a custom CDN url', () => {
    expect(resolveCdnHost(makeConfig({ cdnPreset: 'custom', customCdnUrl: '  https://cdn.example.com  ' }))).toBe(
      'https://cdn.example.com',
    );
  });
});

describe('resolveAppView', () => {
  it('resolves the bsky preset', () => {
    expect(resolveAppView(makeConfig({ preset: 'bsky' }))).toEqual(APP_VIEW_PRESETS.bsky);
  });

  it('resolves the blacksky preset', () => {
    expect(resolveAppView(makeConfig({ preset: 'blacksky' }))).toEqual(APP_VIEW_PRESETS.blacksky);
  });

  it('falls back to the bsky preset for an unknown preset id', () => {
    const config = makeConfig({ preset: 'mystery' as AppViewConfig['preset'] });
    expect(resolveAppView(config)).toEqual(APP_VIEW_PRESETS.bsky);
  });

  it('resolves a valid custom preset using a did:web', () => {
    const config = makeConfig({
      preset: 'custom',
      customUrl: 'https://appview.example.com/',
      customDid: 'did:web:appview.example.com',
    });
    expect(resolveAppView(config)).toEqual({
      url: 'https://appview.example.com',
      did: 'did:web:appview.example.com',
    });
  });

  it('resolves a custom preset using a plain did:plc', () => {
    const config = makeConfig({
      preset: 'custom',
      customUrl: 'https://appview.example.com',
      customDid: 'did:plc:abc123',
    });
    expect(resolveAppView(config)).toEqual({
      url: 'https://appview.example.com',
      did: 'did:plc:abc123',
    });
  });

  it('resolves a custom preset using a did:plc and strips a #bsky_appview fragment', () => {
    const config = makeConfig({
      preset: 'custom',
      customUrl: 'https://appview.example.com',
      customDid: 'did:plc:abc123#bsky_appview',
    });
    expect(resolveAppView(config)).toEqual({
      url: 'https://appview.example.com',
      did: 'did:plc:abc123',
    });
  });

  it('falls back to bsky when the custom url is missing', () => {
    const config = makeConfig({ preset: 'custom', customDid: 'did:web:appview.example.com' });
    expect(resolveAppView(config)).toEqual(APP_VIEW_PRESETS.bsky);
  });

  it('falls back to bsky when the custom did is missing', () => {
    const config = makeConfig({ preset: 'custom', customUrl: 'https://appview.example.com' });
    expect(resolveAppView(config)).toEqual(APP_VIEW_PRESETS.bsky);
  });

  it('falls back to bsky when the custom url is not http(s)', () => {
    const config = makeConfig({
      preset: 'custom',
      customUrl: 'appview.example.com',
      customDid: 'did:web:appview.example.com',
    });
    expect(resolveAppView(config)).toEqual(APP_VIEW_PRESETS.bsky);
  });

  it('falls back to bsky when the custom did is not a recognised method', () => {
    const config = makeConfig({
      preset: 'custom',
      customUrl: 'https://appview.example.com',
      customDid: 'did:key:zabc',
    });
    expect(resolveAppView(config)).toEqual(APP_VIEW_PRESETS.bsky);
  });
});

describe('resolveAccountAppView', () => {
  const globalConfig = makeConfig({ preset: 'bsky' });

  it('uses the global config when the account is null', () => {
    expect(resolveAccountAppView(null, globalConfig)).toEqual(APP_VIEW_PRESETS.bsky);
  });

  it('uses the global config when the account is undefined', () => {
    expect(resolveAccountAppView(undefined, globalConfig)).toEqual(APP_VIEW_PRESETS.bsky);
  });

  it('uses the global config when there is no override', () => {
    const account: Pick<Account, 'appView'> = {};
    expect(resolveAccountAppView(account, makeConfig({ preset: 'blacksky' }))).toEqual(APP_VIEW_PRESETS.blacksky);
  });

  it('uses the global config when the override preset is "default"', () => {
    const account: Pick<Account, 'appView'> = { appView: { preset: 'default' } };
    expect(resolveAccountAppView(account, makeConfig({ preset: 'blacksky' }))).toEqual(APP_VIEW_PRESETS.blacksky);
  });

  it('applies a per-account preset override', () => {
    const account: Pick<Account, 'appView'> = { appView: { preset: 'blacksky' } };
    expect(resolveAccountAppView(account, globalConfig)).toEqual(APP_VIEW_PRESETS.blacksky);
  });

  it('applies a per-account custom override', () => {
    const account: Pick<Account, 'appView'> = {
      appView: {
        preset: 'custom',
        customUrl: 'https://account.example.com',
        customDid: 'did:web:account.example.com',
      },
    };
    expect(resolveAccountAppView(account, globalConfig)).toEqual({
      url: 'https://account.example.com',
      did: 'did:web:account.example.com',
    });
  });

  it('falls back to bsky when a custom override is invalid', () => {
    const account: Pick<Account, 'appView'> = {
      appView: { preset: 'custom', customUrl: 'not-a-url' },
    };
    expect(resolveAccountAppView(account, globalConfig)).toEqual(APP_VIEW_PRESETS.bsky);
  });
});
