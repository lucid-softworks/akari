import {
  DEFAULT_SIGNUP_PROVIDER,
  getProviderPickerLabel,
  SIGNUP_PROVIDER_ORDER,
  SIGNUP_PROVIDERS,
  type SignupProvider,
  type SignupProviderId,
} from '@/utils/signupProviders';

describe('SIGNUP_PROVIDERS', () => {
  const presetIds: Exclude<SignupProviderId, 'custom'>[] = [
    'bsky',
    'blacksky',
    'selfhosted',
    'eurosky',
  ];

  it('exposes exactly the four preset providers', () => {
    expect(Object.keys(SIGNUP_PROVIDERS).toSorted()).toEqual(presetIds.toSorted());
  });

  it.each(presetIds)('gives provider %s a coherent shape', (id) => {
    const provider: SignupProvider = SIGNUP_PROVIDERS[id];
    // The map key must match the provider's own id.
    expect(provider.id).toBe(id);
    expect(typeof provider.label).toBe('string');
    expect(provider.label.length).toBeGreaterThan(0);
    expect(provider.pdsUrl).toMatch(/^https:\/\//);
    expect(provider.handleSuffixes.length).toBeGreaterThan(0);
    // Every suffix is a leading-dot domain.
    for (const suffix of provider.handleSuffixes) {
      expect(suffix.startsWith('.')).toBe(true);
    }
  });

  it('lists multiple handle suffixes for blacksky with the default first', () => {
    expect(SIGNUP_PROVIDERS.blacksky.handleSuffixes[0]).toBe('.blacksky.app');
    expect(SIGNUP_PROVIDERS.blacksky.handleSuffixes.length).toBeGreaterThan(1);
  });
});

describe('SIGNUP_PROVIDER_ORDER', () => {
  it('orders every preset plus the custom escape hatch', () => {
    expect(SIGNUP_PROVIDER_ORDER).toEqual([
      'bsky',
      'blacksky',
      'selfhosted',
      'eurosky',
      'custom',
    ]);
  });

  it('ends with the custom entry', () => {
    expect(SIGNUP_PROVIDER_ORDER[SIGNUP_PROVIDER_ORDER.length - 1]).toBe('custom');
  });

  it('references each preset provider exactly once', () => {
    const presets = SIGNUP_PROVIDER_ORDER.filter((id) => id !== 'custom');
    expect(presets.toSorted()).toEqual(Object.keys(SIGNUP_PROVIDERS).toSorted());
  });
});

describe('DEFAULT_SIGNUP_PROVIDER', () => {
  it('defaults to a known preset provider', () => {
    expect(DEFAULT_SIGNUP_PROVIDER).toBe('bsky');
    expect(SIGNUP_PROVIDER_ORDER).toContain(DEFAULT_SIGNUP_PROVIDER);
    expect(SIGNUP_PROVIDERS[DEFAULT_SIGNUP_PROVIDER as 'bsky']).toBeDefined();
  });
});

describe('getProviderPickerLabel', () => {
  it('returns the brand label for preset providers, ignoring the custom label', () => {
    expect(getProviderPickerLabel('bsky', 'Custom')).toBe('Bluesky');
    expect(getProviderPickerLabel('blacksky', 'Custom')).toBe('Blacksky');
    expect(getProviderPickerLabel('selfhosted', 'Custom')).toBe('selfhosted.social');
    expect(getProviderPickerLabel('eurosky', 'Custom')).toBe('eurosky.social');
  });

  it('returns the supplied custom label for the custom escape hatch', () => {
    expect(getProviderPickerLabel('custom', 'Custom PDS')).toBe('Custom PDS');
  });

  it('passes the custom label through verbatim', () => {
    expect(getProviderPickerLabel('custom', '')).toBe('');
    expect(getProviderPickerLabel('custom', 'Mein eigener Server')).toBe('Mein eigener Server');
  });
});
