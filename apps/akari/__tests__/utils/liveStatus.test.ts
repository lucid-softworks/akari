import type { BlueskyActorStatusView } from '@/bluesky-api';
import type { LiveNowEntry } from '@/hooks/queries/useLiveNow';
import {
  DEFAULT_ALLOWED_LIVE_DOMAINS,
  allowedLiveHostsForDid,
  formatAllowedLiveServices,
  getLiveHost,
  isLiveHostAllowed,
  isProfileLive,
  liveServiceName,
} from '@/utils/liveStatus';

const LIVE_TOKEN = 'app.bsky.actor.status#live';

function makeStatus(overrides: Partial<BlueskyActorStatusView> = {}): BlueskyActorStatusView {
  return {
    status: LIVE_TOKEN,
    record: {},
    embed: {
      $type: 'app.bsky.embed.external#view',
      external: { uri: 'https://www.youtube.com/watch?v=abc' },
    },
    ...overrides,
  };
}

describe('getLiveHost', () => {
  it('normalizes a hostname and strips a leading www.', () => {
    expect(getLiveHost('https://www.youtube.com/watch?v=abc')).toBe('youtube.com');
  });

  it('lowercases the host', () => {
    expect(getLiveHost('https://YouTube.COM/live')).toBe('youtube.com');
  });

  it('keeps provider subdomains intact', () => {
    expect(getLiveHost('https://someone.substack.com/p/x')).toBe('someone.substack.com');
  });

  it('returns null for an unparseable url', () => {
    expect(getLiveHost('not a url')).toBeNull();
    expect(getLiveHost('')).toBeNull();
  });
});

describe('isLiveHostAllowed', () => {
  const allowed = new Set(['youtube.com', 'substack.com']);

  it('matches an exact host', () => {
    expect(isLiveHostAllowed('youtube.com', allowed)).toBe(true);
  });

  it('matches a subdomain of an allowed host', () => {
    expect(isLiveHostAllowed('someone.substack.com', allowed)).toBe(true);
  });

  it('normalizes the allowed entries before comparing', () => {
    expect(isLiveHostAllowed('youtube.com', new Set(['www.YouTube.com']))).toBe(true);
  });

  it('rejects an unrelated host', () => {
    expect(isLiveHostAllowed('evil.com', allowed)).toBe(false);
  });

  it('rejects a host that merely contains an allowed domain as a substring', () => {
    expect(isLiveHostAllowed('youtube.com.evil.com', allowed)).toBe(false);
    expect(isLiveHostAllowed('notyoutube.com', allowed)).toBe(false);
  });

  it('returns false against an empty allow set', () => {
    expect(isLiveHostAllowed('youtube.com', new Set())).toBe(false);
  });
});

describe('allowedLiveHostsForDid', () => {
  const entries: LiveNowEntry[] = [
    { did: 'did:plc:alice', domains: ['example.com', 'foo.tv'] },
    { did: 'did:plc:bob', domains: ['bob-only.com'] },
  ];

  it('always includes the default allowed domains', () => {
    const hosts = allowedLiveHostsForDid(undefined, []);
    for (const domain of DEFAULT_ALLOWED_LIVE_DOMAINS) {
      expect(hosts.has(domain)).toBe(true);
    }
  });

  it('folds in per-DID domains for a matching did', () => {
    const hosts = allowedLiveHostsForDid('did:plc:alice', entries);
    expect(hosts.has('example.com')).toBe(true);
    expect(hosts.has('foo.tv')).toBe(true);
    expect(hosts.has('bob-only.com')).toBe(false);
  });

  it('ignores per-DID config when did is undefined', () => {
    const hosts = allowedLiveHostsForDid(undefined, entries);
    expect(hosts.has('example.com')).toBe(false);
  });

  it('returns only defaults when the did has no entry', () => {
    const hosts = allowedLiveHostsForDid('did:plc:nobody', entries);
    expect(hosts.has('example.com')).toBe(false);
    expect(hosts.has('youtube.com')).toBe(true);
  });
});

describe('liveServiceName', () => {
  it('returns the friendly name for a known host', () => {
    expect(liveServiceName('twitch.tv')).toBe('Twitch');
    expect(liveServiceName('youtube.com')).toBe('YouTube');
    expect(liveServiceName('stream.place')).toBe('Streamplace');
  });

  it('falls back to the bare host for an unknown service', () => {
    expect(liveServiceName('unknown.example')).toBe('unknown.example');
  });
});

describe('formatAllowedLiveServices', () => {
  it('joins friendly names with commas', () => {
    const result = formatAllowedLiveServices(new Set(['twitch.tv', 'youtube.com']));
    expect(result).toBe('Twitch, YouTube');
  });

  it('normalizes hosts and de-duplicates resulting names', () => {
    const result = formatAllowedLiveServices(new Set(['www.youtube.com', 'youtube.com']));
    expect(result).toBe('YouTube');
  });

  it('returns an empty string for an empty set', () => {
    expect(formatAllowedLiveServices(new Set())).toBe('');
  });
});

describe('isProfileLive', () => {
  const NOW = Date.parse('2026-05-29T12:00:00.000Z');

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(NOW);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns false when there is no status', () => {
    expect(isProfileLive(undefined, 'did:plc:alice', [])).toBe(false);
  });

  it('returns false when the status token is not the live token', () => {
    const status = makeStatus({ status: 'app.bsky.actor.status#offline' });
    expect(isProfileLive(status, 'did:plc:alice', [])).toBe(false);
  });

  it('returns false when the status is disabled by a moderator', () => {
    expect(isProfileLive(makeStatus({ isDisabled: true }), 'did:plc:alice', [])).toBe(false);
  });

  it('returns false when isActive is explicitly false', () => {
    expect(isProfileLive(makeStatus({ isActive: false }), 'did:plc:alice', [])).toBe(false);
  });

  it('returns false when the status has already expired', () => {
    const status = makeStatus({ expiresAt: '2026-05-29T11:00:00.000Z' });
    expect(isProfileLive(status, 'did:plc:alice', [])).toBe(false);
  });

  it('treats an expiry exactly equal to now as expired', () => {
    const status = makeStatus({ expiresAt: new Date(NOW).toISOString() });
    expect(isProfileLive(status, 'did:plc:alice', [])).toBe(false);
  });

  it('ignores a non-finite expiry timestamp', () => {
    const status = makeStatus({ expiresAt: 'not-a-date' });
    expect(isProfileLive(status, 'did:plc:alice', [])).toBe(true);
  });

  it('returns false when the embed has no host', () => {
    const status = makeStatus({ embed: { external: { uri: 'not a url' } } });
    expect(isProfileLive(status, 'did:plc:alice', [])).toBe(false);
  });

  it('returns false when there is no embed at all', () => {
    const status = makeStatus({ embed: undefined });
    expect(isProfileLive(status, 'did:plc:alice', [])).toBe(false);
  });

  it('returns false when the host is not allowed for this DID', () => {
    const status = makeStatus({ embed: { external: { uri: 'https://evil.com/live' } } });
    expect(isProfileLive(status, 'did:plc:alice', [])).toBe(false);
  });

  it('returns true for a valid, unexpired, allowed default host', () => {
    expect(isProfileLive(makeStatus(), 'did:plc:alice', [])).toBe(true);
  });

  it('returns true when the future expiry is still ahead of now', () => {
    const status = makeStatus({ expiresAt: '2026-05-29T13:00:00.000Z' });
    expect(isProfileLive(status, 'did:plc:alice', [])).toBe(true);
  });

  it('returns true for a host granted only via per-DID config', () => {
    const entries: LiveNowEntry[] = [{ did: 'did:plc:alice', domains: ['custom.example'] }];
    const status = makeStatus({ embed: { external: { uri: 'https://custom.example/live' } } });
    expect(isProfileLive(status, 'did:plc:alice', entries)).toBe(true);
  });
});
