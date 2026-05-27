/**
 * PDSes the in-app signup form knows how to create accounts on, plus a
 * `custom` escape hatch that lets the user point at any PDS they please.
 *
 * For the preset providers, `pdsUrl` is the host that handles
 * `com.atproto.server.createAccount` and `handleSuffixes` lists the
 * domains the PDS issues handles under (index 0 is the default the
 * form auto-selects). For `custom`, the screen collects the PDS URL
 * and full handle from the user directly.
 */
export type SignupProviderId = 'bsky' | 'blacksky' | 'selfhosted' | 'eurosky' | 'custom';

export type SignupProvider = {
  id: Exclude<SignupProviderId, 'custom'>;
  label: string;
  pdsUrl: string;
  handleSuffixes: readonly string[];
};

export const SIGNUP_PROVIDERS: Record<Exclude<SignupProviderId, 'custom'>, SignupProvider> = {
  bsky: {
    id: 'bsky',
    label: 'Bluesky',
    pdsUrl: 'https://bsky.social',
    handleSuffixes: ['.bsky.social'],
  },
  blacksky: {
    id: 'blacksky',
    label: 'Blacksky',
    pdsUrl: 'https://blacksky.app',
    handleSuffixes: [
      '.blacksky.app',
      '.myatproto.social',
      '.cryptoanarchy.network',
      '.latinsky.app',
      '.afrolatinsky.app',
    ],
  },
  selfhosted: {
    id: 'selfhosted',
    label: 'selfhosted.social',
    pdsUrl: 'https://selfhosted.social',
    handleSuffixes: ['.selfhosted.social'],
  },
  eurosky: {
    id: 'eurosky',
    label: 'eurosky.social',
    pdsUrl: 'https://eurosky.social',
    handleSuffixes: ['.eurosky.social'],
  },
} as const;

export const SIGNUP_PROVIDER_ORDER: readonly SignupProviderId[] = [
  'bsky',
  'blacksky',
  'selfhosted',
  'eurosky',
  'custom',
];

export const DEFAULT_SIGNUP_PROVIDER: SignupProviderId = 'bsky';

/**
 * Display label for the picker chip. Preset providers use the brand name
 * from `SIGNUP_PROVIDERS`; the custom escape hatch gets its own translated
 * label resolved at the call site.
 */
export function getProviderPickerLabel(id: SignupProviderId, customLabel: string): string {
  if (id === 'custom') return customLabel;
  return SIGNUP_PROVIDERS[id].label;
}
