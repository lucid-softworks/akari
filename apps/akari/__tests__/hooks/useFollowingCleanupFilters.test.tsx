import { renderHook } from '@testing-library/react-native';

import { useFollowingCleanupFilters } from '@/hooks/useFollowingCleanupFilters';
import type { FollowingCleanupEntry, FollowingCleanupState } from '@/utils/followingCleanupController';

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-05-29T00:00:00.000Z').getTime();

function makeEntry(overrides: Partial<FollowingCleanupEntry> & { did: string }): FollowingCleanupEntry {
  const { did, profile, ...rest } = overrides;
  return {
    status: 'done',
    lastActivityAt: null,
    followedAt: null,
    ...rest,
    profile: {
      did,
      handle: `${did}.test`,
      ...profile,
    } as FollowingCleanupEntry['profile'],
  };
}

function makeState(entries: FollowingCleanupEntry[]): FollowingCleanupState {
  const map: FollowingCleanupState['entries'] = {};
  for (const e of entries) map[e.profile.did] = e;
  return {
    entries: map,
    totalDiscovered: entries.length,
    totalScanned: entries.length,
    paginationDone: true,
    runState: 'completed',
  };
}

describe('useFollowingCleanupFilters', () => {
  it('excludes entries that are not done', () => {
    const state = makeState([
      makeEntry({ did: 'pending', status: 'pending', lastActivityAt: null }),
      makeEntry({ did: 'done', status: 'done', lastActivityAt: null }),
    ]);
    const { result } = renderHook(() =>
      useFollowingCleanupFilters(state, new Set(), 'never', 'lastActivity', NOW),
    );
    expect(result.current.filteredFollows.map((e) => e.profile.did)).toEqual(['done']);
  });

  it('excludes skipped dids from filteredFollows', () => {
    const state = makeState([
      makeEntry({ did: 'a', lastActivityAt: null }),
      makeEntry({ did: 'b', lastActivityAt: null }),
    ]);
    const { result } = renderHook(() =>
      useFollowingCleanupFilters(state, new Set(['a']), 'never', 'lastActivity', NOW),
    );
    expect(result.current.filteredFollows.map((e) => e.profile.did)).toEqual(['b']);
  });

  it("threshold 'never' only keeps entries with null lastActivity", () => {
    const state = makeState([
      makeEntry({ did: 'silent', lastActivityAt: null }),
      makeEntry({ did: 'active', lastActivityAt: new Date(NOW).toISOString() }),
    ]);
    const { result } = renderHook(() =>
      useFollowingCleanupFilters(state, new Set(), 'never', 'lastActivity', NOW),
    );
    expect(result.current.filteredFollows.map((e) => e.profile.did)).toEqual(['silent']);
  });

  it('numeric threshold keeps null-activity entries and entries older than the cutoff', () => {
    const state = makeState([
      makeEntry({ did: 'null', lastActivityAt: null }),
      makeEntry({ did: 'old', lastActivityAt: new Date(NOW - 40 * DAY_MS).toISOString() }),
      makeEntry({ did: 'recent', lastActivityAt: new Date(NOW - 10 * DAY_MS).toISOString() }),
    ]);
    const { result } = renderHook(() =>
      useFollowingCleanupFilters(state, new Set(), 30, 'lastActivity', NOW),
    );
    const dids = result.current.filteredFollows.map((e) => e.profile.did);
    expect(dids).toContain('null');
    expect(dids).toContain('old');
    expect(dids).not.toContain('recent');
  });

  it('sorts by lastActivity ascending (oldest first, null treated as 0)', () => {
    const state = makeState([
      makeEntry({ did: 'newer', lastActivityAt: new Date(NOW - 40 * DAY_MS).toISOString() }),
      makeEntry({ did: 'older', lastActivityAt: new Date(NOW - 100 * DAY_MS).toISOString() }),
      makeEntry({ did: 'null', lastActivityAt: null }),
    ]);
    const { result } = renderHook(() =>
      useFollowingCleanupFilters(state, new Set(), 30, 'lastActivity', NOW),
    );
    expect(result.current.filteredFollows.map((e) => e.profile.did)).toEqual([
      'null',
      'older',
      'newer',
    ]);
  });

  it('sorts by followedAt with null sorting to the bottom', () => {
    const state = makeState([
      makeEntry({ did: 'recentFollow', lastActivityAt: null, followedAt: new Date(NOW - 5 * DAY_MS).toISOString() }),
      makeEntry({ did: 'oldFollow', lastActivityAt: null, followedAt: new Date(NOW - 500 * DAY_MS).toISOString() }),
      makeEntry({ did: 'noFollow', lastActivityAt: null, followedAt: null }),
    ]);
    const { result } = renderHook(() =>
      useFollowingCleanupFilters(state, new Set(), 'never', 'followedAt', NOW),
    );
    expect(result.current.filteredFollows.map((e) => e.profile.did)).toEqual([
      'oldFollow',
      'recentFollow',
      'noFollow',
    ]);
  });

  it('sorts by fewestPosts ascending (missing count treated as 0)', () => {
    const state = makeState([
      makeEntry({ did: 'many', lastActivityAt: null, profile: { postsCount: 100 } as never }),
      makeEntry({ did: 'few', lastActivityAt: null, profile: { postsCount: 2 } as never }),
      makeEntry({ did: 'none', lastActivityAt: null }),
    ]);
    const { result } = renderHook(() =>
      useFollowingCleanupFilters(state, new Set(), 'never', 'fewestPosts', NOW),
    );
    expect(result.current.filteredFollows.map((e) => e.profile.did)).toEqual([
      'none',
      'few',
      'many',
    ]);
  });

  it('sorts by mostFollowers descending (missing count treated as 0)', () => {
    const state = makeState([
      makeEntry({ did: 'small', lastActivityAt: null, profile: { followersCount: 5 } as never }),
      makeEntry({ did: 'big', lastActivityAt: null, profile: { followersCount: 9000 } as never }),
      makeEntry({ did: 'none', lastActivityAt: null }),
    ]);
    const { result } = renderHook(() =>
      useFollowingCleanupFilters(state, new Set(), 'never', 'mostFollowers', NOW),
    );
    expect(result.current.filteredFollows.map((e) => e.profile.did)).toEqual([
      'big',
      'small',
      'none',
    ]);
  });

  it('followedAt sort handles both present and missing followedAt on either side', () => {
    const state = makeState([
      makeEntry({ did: 'hasFollow', lastActivityAt: null, followedAt: new Date(NOW - 3 * DAY_MS).toISOString() }),
      makeEntry({ did: 'noFollowA', lastActivityAt: null, followedAt: null }),
      makeEntry({ did: 'noFollowB', lastActivityAt: null, followedAt: null }),
    ]);
    const { result } = renderHook(() =>
      useFollowingCleanupFilters(state, new Set(), 'never', 'followedAt', NOW),
    );
    expect(result.current.filteredFollows[0].profile.did).toBe('hasFollow');
  });

  it('lastActivity sort places null-activity entries first', () => {
    const state = makeState([
      makeEntry({ did: 'hasActivity', lastActivityAt: new Date(NOW - 200 * DAY_MS).toISOString() }),
      makeEntry({ did: 'nullActivity', lastActivityAt: null }),
    ]);
    const { result } = renderHook(() =>
      useFollowingCleanupFilters(state, new Set(), 30, 'lastActivity', NOW),
    );
    expect(result.current.filteredFollows.map((e) => e.profile.did)).toEqual([
      'nullActivity',
      'hasActivity',
    ]);
  });

  it('skippedEntries only includes skipped dids that have a scanned entry', () => {
    const state = makeState([
      makeEntry({ did: 'scanned', lastActivityAt: null }),
    ]);
    const { result } = renderHook(() =>
      useFollowingCleanupFilters(state, new Set(['scanned', 'unscanned']), 'never', 'lastActivity', NOW),
    );
    expect(result.current.skippedEntries.map((e) => e.profile.did)).toEqual(['scanned']);
  });
});
