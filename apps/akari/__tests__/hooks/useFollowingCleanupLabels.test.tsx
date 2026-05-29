import { renderHook } from '@testing-library/react-native';

import { useFollowingCleanupLabels } from '@/hooks/useFollowingCleanupLabels';
import type { FollowingCleanupEntry } from '@/utils/followingCleanupController';

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-05-29T00:00:00.000Z').getTime();

function makeEntry(overrides: Omit<Partial<FollowingCleanupEntry>, 'profile'> & { profile?: Record<string, unknown> }): FollowingCleanupEntry {
  const { profile, ...rest } = overrides;
  return {
    status: 'done',
    lastActivityAt: null,
    followedAt: null,
    ...rest,
    profile: {
      did: 'did:plc:test',
      handle: 'test.test',
      ...profile,
    } as FollowingCleanupEntry['profile'],
  };
}

describe('useFollowingCleanupLabels', () => {
  describe('getLastActivityLabel', () => {
    it('returns activityUnknown when lastActivity is null and postsCount is undefined', () => {
      const { result } = renderHook(() => useFollowingCleanupLabels(NOW));
      const label = result.current.getLastActivityLabel(makeEntry({ lastActivityAt: null }));
      expect(label).toBe('settings.followingCleanup.activityUnknown');
    });

    it('returns activityUnknown when null activity but postsCount > 0 (AppView gap)', () => {
      const { result } = renderHook(() => useFollowingCleanupLabels(NOW));
      const label = result.current.getLastActivityLabel(
        makeEntry({ lastActivityAt: null, profile: { postsCount: 12 } }),
      );
      expect(label).toBe('settings.followingCleanup.activityUnknown');
    });

    it('returns neverPosted when null activity and postsCount is 0', () => {
      const { result } = renderHook(() => useFollowingCleanupLabels(NOW));
      const label = result.current.getLastActivityLabel(
        makeEntry({ lastActivityAt: null, profile: { postsCount: 0 } }),
      );
      expect(label).toBe('settings.followingCleanup.neverPosted');
    });

    it('returns lastSeenToday for activity less than a day ago', () => {
      const { result } = renderHook(() => useFollowingCleanupLabels(NOW));
      const label = result.current.getLastActivityLabel(
        makeEntry({ lastActivityAt: new Date(NOW - 1000).toISOString() }),
      );
      expect(label).toBe('settings.followingCleanup.lastSeenToday');
    });

    it('returns lastSeenOneDay for exactly one day ago', () => {
      const { result } = renderHook(() => useFollowingCleanupLabels(NOW));
      const label = result.current.getLastActivityLabel(
        makeEntry({ lastActivityAt: new Date(NOW - DAY_MS).toISOString() }),
      );
      expect(label).toBe('settings.followingCleanup.lastSeenOneDay');
    });

    it('returns lastSeenDays for multiple days ago', () => {
      const { result } = renderHook(() => useFollowingCleanupLabels(NOW));
      const label = result.current.getLastActivityLabel(
        makeEntry({ lastActivityAt: new Date(NOW - 5 * DAY_MS).toISOString() }),
      );
      expect(label).toBe('settings.followingCleanup.lastSeenDays');
    });
  });

  describe('getFollowedAtLabel', () => {
    it('returns null when followedAt is missing', () => {
      const { result } = renderHook(() => useFollowingCleanupLabels(NOW));
      expect(result.current.getFollowedAtLabel(makeEntry({ followedAt: null }))).toBeNull();
    });

    it('returns followedToday for less than a day', () => {
      const { result } = renderHook(() => useFollowingCleanupLabels(NOW));
      expect(
        result.current.getFollowedAtLabel(makeEntry({ followedAt: new Date(NOW - 1000).toISOString() })),
      ).toBe('settings.followingCleanup.followedToday');
    });

    it('returns followedOneDay for exactly one day', () => {
      const { result } = renderHook(() => useFollowingCleanupLabels(NOW));
      expect(
        result.current.getFollowedAtLabel(makeEntry({ followedAt: new Date(NOW - DAY_MS).toISOString() })),
      ).toBe('settings.followingCleanup.followedOneDay');
    });

    it('returns followedDays for under 30 days', () => {
      const { result } = renderHook(() => useFollowingCleanupLabels(NOW));
      expect(
        result.current.getFollowedAtLabel(makeEntry({ followedAt: new Date(NOW - 10 * DAY_MS).toISOString() })),
      ).toBe('settings.followingCleanup.followedDays');
    });

    it('returns followedMonths between 30 days and a year', () => {
      const { result } = renderHook(() => useFollowingCleanupLabels(NOW));
      expect(
        result.current.getFollowedAtLabel(makeEntry({ followedAt: new Date(NOW - 90 * DAY_MS).toISOString() })),
      ).toBe('settings.followingCleanup.followedMonths');
    });

    it('returns followedYears beyond a year', () => {
      const { result } = renderHook(() => useFollowingCleanupLabels(NOW));
      expect(
        result.current.getFollowedAtLabel(makeEntry({ followedAt: new Date(NOW - 800 * DAY_MS).toISOString() })),
      ).toBe('settings.followingCleanup.followedYears');
    });
  });

  describe('getStatsLabel', () => {
    it('returns null when no counts are present', () => {
      const { result } = renderHook(() => useFollowingCleanupLabels(NOW));
      expect(result.current.getStatsLabel(makeEntry({ profile: {} }))).toBeNull();
    });

    it('returns the stats key when at least one count is present', () => {
      const { result } = renderHook(() => useFollowingCleanupLabels(NOW));
      const label = result.current.getStatsLabel(
        makeEntry({ profile: { followersCount: 1200, followsCount: 50, postsCount: 3400 } }),
      );
      expect(label).toBe('settings.followingCleanup.stats');
    });

    it('renders the line even when only one count is defined', () => {
      const { result } = renderHook(() => useFollowingCleanupLabels(NOW));
      const label = result.current.getStatsLabel(makeEntry({ profile: { postsCount: 0 } }));
      expect(label).toBe('settings.followingCleanup.stats');
    });
  });
});
