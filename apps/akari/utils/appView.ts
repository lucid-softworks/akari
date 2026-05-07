/**
 * AppView selection — which `BskyAppView` instance gets to serve the
 * `app.bsky.*` / `chat.bsky.*` queries for an account.
 *
 * In atproto, the user's PDS proxies these queries to a configured
 * AppView. Clients can override that target by sending the
 * `atproto-proxy: <did>#bsky_appview` header on requests; the PDS
 * forwards to the named service on the user's behalf, including a
 * service-auth token. The AppView's URL is published in its DID
 * document under the `#bsky_appview` service entry.
 *
 * For the unauthenticated discovery / typeahead flows that run before
 * a user has signed in (and so before any PDS exists to proxy through),
 * we hit the chosen AppView's HTTPS endpoint directly.
 */

import type { Account } from '@/types/account';

export type AppViewPresetId = 'bsky' | 'blacksky' | 'custom';

export type AppViewConfig = {
  preset: AppViewPresetId;
  /** Only consulted when preset === 'custom'. */
  customUrl?: string;
  /** Only consulted when preset === 'custom'. Stored without the `#bsky_appview` suffix. */
  customDid?: string;
  /**
   * Image CDN preset. Independent of the AppView preset — image URLs whose
   * host matches a known Bluesky CDN are rewritten to the resolved CDN host
   * (path layout matches across mirrors so a host swap is enough).
   */
  cdnPreset: CdnPresetId;
  /** Only consulted when `cdnPreset === 'custom'`. */
  customCdnUrl?: string;
};

export type CdnPresetId = 'bsky' | 'blueat' | 'custom';

export type CdnPreset = {
  id: CdnPresetId;
  label: string;
  description: string;
  /**
   * Resolved base URL of the CDN. `undefined` for the bsky preset because
   * URLs already point at `cdn.bsky.app` and need no rewrite.
   */
  url: string | undefined;
};

export const CDN_PRESETS: Record<Exclude<CdnPresetId, 'custom'>, CdnPreset> = {
  bsky: {
    id: 'bsky',
    label: 'Bluesky',
    description: 'cdn.bsky.app — the default CDN operated by Bluesky Social.',
    url: undefined,
  },
  blueat: {
    id: 'blueat',
    label: 'Blueat',
    description: 'cdn.blueat.net — community-run CDN mirror.',
    url: 'https://cdn.blueat.net',
  },
} as const;

export type ResolvedAppView = {
  /** Absolute `https://…` base URL of the AppView. Used for unauthenticated discovery / typeahead / trending calls. */
  url: string;
  /** Service DID without the `#bsky_appview` suffix. Empty string means "no proxy header" — the AppView serves directly. */
  did: string;
};

export type AppViewPreset = ResolvedAppView & {
  id: AppViewPresetId;
  /** Display name used in the settings picker. */
  label: string;
  /** Short description rendered under the row. */
  description: string;
};

export const APP_VIEW_PRESETS: Record<Exclude<AppViewPresetId, 'custom'>, AppViewPreset> = {
  bsky: {
    id: 'bsky',
    label: 'Bluesky',
    description: 'public.api.bsky.app — the default AppView operated by Bluesky Social.',
    url: 'https://public.api.bsky.app',
    did: 'did:web:api.bsky.app',
  },
  blacksky: {
    id: 'blacksky',
    label: 'Blacksky',
    description: 'api.blacksky.community — community-run AppView with custom moderation.',
    url: 'https://api.blacksky.community',
    did: 'did:web:api.blacksky.community',
  },
} as const;

export const DEFAULT_APP_VIEW: AppViewConfig = { preset: 'bsky', cdnPreset: 'bsky' };

/**
 * Resolve the user's CDN choice to a host override. Returns `undefined` when
 * the bsky preset is active (no rewrite needed) or when the custom preset
 * is selected without a usable URL.
 */
export function resolveCdnHost(config: AppViewConfig): string | undefined {
  if (config.cdnPreset === 'custom') {
    return normalizeUrl(config.customCdnUrl);
  }
  if (config.cdnPreset === 'blueat') return CDN_PRESETS.blueat.url;
  return undefined;
}

const TRAILING_SLASH = /\/+$/;

function normalizeUrl(input: string | undefined): string | undefined {
  if (!input) return undefined;
  const trimmed = input.trim();
  if (!trimmed) return undefined;
  if (!/^https?:\/\//i.test(trimmed)) return undefined;
  return trimmed.replace(TRAILING_SLASH, '');
}

function normalizeDid(input: string | undefined): string | undefined {
  if (!input) return undefined;
  const trimmed = input.trim();
  if (!trimmed) return undefined;
  // Accept the user pasting either `did:web:foo#bsky_appview` or `did:web:foo` —
  // we store the unsuffixed form and append `#bsky_appview` at the call site.
  const withoutFragment = trimmed.split('#', 1)[0];
  if (!withoutFragment.startsWith('did:plc:') && !withoutFragment.startsWith('did:web:')) {
    return undefined;
  }
  return withoutFragment;
}

/**
 * Resolve a config (preset + custom fields) to a concrete `{ url, did }` pair.
 * Falls back to the bsky preset when the custom fields are missing or invalid
 * so we never end up with an unusable client.
 */
export function resolveAppView(config: AppViewConfig): ResolvedAppView {
  if (config.preset === 'custom') {
    const url = normalizeUrl(config.customUrl);
    const did = normalizeDid(config.customDid);
    if (url && did) return { url, did };
    return APP_VIEW_PRESETS.bsky;
  }
  const preset = APP_VIEW_PRESETS[config.preset];
  return preset ?? APP_VIEW_PRESETS.bsky;
}

/**
 * Per-account override stored on the `Account`. `preset === 'default'`
 * (or the field being absent) means "use the app-wide setting" — kept as
 * an explicit value rather than `undefined` so the per-account picker can
 * round-trip the choice without ambiguity.
 */
export type AccountAppViewOverride = {
  preset: AppViewPresetId | 'default';
  customUrl?: string;
  customDid?: string;
};

/**
 * Effective AppView for `account`: the per-account override if set, otherwise
 * the app-wide `globalConfig`.
 */
export function resolveAccountAppView(
  account: Pick<Account, 'appView'> | null | undefined,
  globalConfig: AppViewConfig,
): ResolvedAppView {
  const override = account?.appView;
  if (!override || override.preset === 'default') {
    return resolveAppView(globalConfig);
  }
  return resolveAppView({
    preset: override.preset,
    customUrl: override.customUrl,
    customDid: override.customDid,
    cdnPreset: globalConfig.cdnPreset,
  });
}

/**
 * The proxy header value sent on `app.bsky.*` / `chat.bsky.*` requests when an
 * AppView is configured. Append `#bsky_appview` to the unsuffixed DID — that's
 * the service-id every BskyAppView publishes in its DID document.
 */
export function appViewProxyHeader(did: string): string {
  return `${did}#bsky_appview`;
}
