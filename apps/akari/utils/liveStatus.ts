import type { BlueskyActorStatusView } from '@/bluesky-api';
import type { LiveNowEntry } from '@/hooks/queries/useLiveNow';

/**
 * Hosts that any account may use to go live, independent of the server's
 * curated `liveNow` config. Mirrors Bluesky's official client allowlist so
 * our validation matches what the AppView will actually surface.
 *
 * The server may extend this per-DID (see {@link allowedLiveHostsForDid}),
 * but these are always permitted.
 */
export const DEFAULT_ALLOWED_LIVE_DOMAINS = [
  'twitch.tv',
  'stream.place',
  'bluecast.app',
  'youtube.com',
  'substack.com',
  'beehiiv.com',
] as const;

/**
 * Friendly display names for the supported live services, keyed by apex
 * domain. Used for the "allowed services" hint and for the default link-card
 * title when we have no fetched metadata.
 */
const LIVE_SERVICE_NAMES: Record<string, string> = {
  'twitch.tv': 'Twitch',
  'youtube.com': 'YouTube',
  'stream.place': 'Streamplace',
  'bluecast.app': 'Bluecast',
  'substack.com': 'Substack',
  'beehiiv.com': 'Beehiiv',
  'nba.com': 'NBA',
  'espn.com': 'ESPN',
  'skylight.social': 'Skylight',
};

/**
 * Lowercases a hostname and strips a leading `www.`. We intentionally keep
 * the rest of the host intact and match allowed domains with a suffix test
 * (see {@link isLiveHostAllowed}) so provider subdomains such as
 * `someone.substack.com` or a channel's `xyz.beehiiv.com` still resolve.
 */
function normalizeHost(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, '');
}

/**
 * Extracts the normalized host from a URL string, or `null` when the value
 * isn't a parseable absolute URL.
 */
export function getLiveHost(url: string): string | null {
  try {
    return normalizeHost(new URL(url).hostname);
  } catch {
    return null;
  }
}

/**
 * True when `host` equals one of `allowed` or is a subdomain of one. `host`
 * is expected to already be normalized (see {@link getLiveHost}).
 */
export function isLiveHostAllowed(host: string, allowed: ReadonlySet<string>): boolean {
  for (const domain of allowed) {
    const d = normalizeHost(domain);
    if (host === d || host.endsWith(`.${d}`)) return true;
  }
  return false;
}

/**
 * The set of hosts a given DID is allowed to go live with: the global
 * defaults plus any per-DID domains the server's `liveNow` config grants.
 * The server config is authoritative for badge display, so we fold its
 * entries in rather than relying on defaults alone.
 */
export function allowedLiveHostsForDid(
  did: string | undefined,
  liveNowEntries: readonly LiveNowEntry[],
): Set<string> {
  const hosts = new Set<string>(DEFAULT_ALLOWED_LIVE_DOMAINS);
  if (did) {
    for (const entry of liveNowEntries) {
      if (entry.did === did) {
        for (const domain of entry.domains) hosts.add(domain);
      }
    }
  }
  return hosts;
}

/** Display name for a host (falls back to the bare host). */
export function liveServiceName(host: string): string {
  return LIVE_SERVICE_NAMES[host] ?? host;
}

/** Comma-separated list of friendly service names for an allowed-host set. */
export function formatAllowedLiveServices(allowed: ReadonlySet<string>): string {
  const names = Array.from(
    new Set(Array.from(allowed, (d) => liveServiceName(normalizeHost(d)))),
  );
  return names.join(', ');
}

/**
 * Resolves the live link's host from a status view's external embed.
 */
function statusEmbedHost(status: BlueskyActorStatusView): string | null {
  const uri = status.embed?.external?.uri;
  return uri ? getLiveHost(uri) : null;
}

/**
 * Whether a profile's status should render as live for viewers. Mirrors the
 * official client's `isStatusValidForViewers` + expiry/disabled checks:
 *
 *  - status token is `app.bsky.actor.status#live`
 *  - not disabled by a moderator
 *  - still active (AppView flag and, defensively, `expiresAt` in the future)
 *  - the embed host is in the allowed set for this DID
 */
export function isProfileLive(
  status: BlueskyActorStatusView | undefined,
  did: string | undefined,
  liveNowEntries: readonly LiveNowEntry[],
): boolean {
  if (!status) return false;
  if (status.status !== 'app.bsky.actor.status#live') return false;
  if (status.isDisabled) return false;
  if (status.isActive === false) return false;
  if (status.expiresAt) {
    const expiry = new Date(status.expiresAt).getTime();
    if (Number.isFinite(expiry) && expiry <= Date.now()) return false;
  }
  const host = statusEmbedHost(status);
  if (!host) return false;
  return isLiveHostAllowed(host, allowedLiveHostsForDid(did, liveNowEntries));
}
