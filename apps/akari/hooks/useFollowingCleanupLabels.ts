import { useCallback } from 'react';

import { useTranslation } from '@/hooks/useTranslation';
import type { FollowingCleanupEntry } from '@/utils/followingCleanupController';

const DAY_MS = 24 * 60 * 60 * 1000;

// Locale-aware compact format e.g. "1.2K" / "3.4M". Falls back to a plain
// integer string on engines that don't support compact notation.
const compactFormatter =
  typeof Intl !== 'undefined' && typeof Intl.NumberFormat === 'function'
    ? new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 })
    : null;
const formatCompact = (n: number) => (compactFormatter ? compactFormatter.format(n) : String(n));

/**
 * Returns the label helpers used by the following-cleanup screen. These
 * are pure functions of the current scan entry and "now", but they all
 * need to read translations, so we centralise them in a hook to avoid
 * duplicating `useTranslation()` calls per row.
 */
export function useFollowingCleanupLabels(nowMs: number) {
  const { t } = useTranslation();

  const getLastActivityLabel = useCallback(
    (entry: FollowingCleanupEntry) => {
      if (entry.lastActivityAt === null) {
        // getProfiles enrichment lands postsCount; if the account actually
        // has posts but the author feed came back empty, that's an AppView
        // gap rather than a genuinely silent account — flag it as unknown
        // so we don't accidentally tar an active poster as "never posted."
        const posts = entry.profile.postsCount;
        if (posts === undefined) return t('settings.followingCleanup.activityUnknown');
        if (posts > 0) return t('settings.followingCleanup.activityUnknown');
        return t('settings.followingCleanup.neverPosted');
      }
      const ageDays = Math.floor((nowMs - new Date(entry.lastActivityAt).getTime()) / DAY_MS);
      if (ageDays < 1) return t('settings.followingCleanup.lastSeenToday');
      if (ageDays === 1) return t('settings.followingCleanup.lastSeenOneDay');
      return t('settings.followingCleanup.lastSeenDays', { count: ageDays });
    },
    [nowMs, t],
  );

  const getFollowedAtLabel = useCallback(
    (entry: FollowingCleanupEntry): string | null => {
      if (!entry.followedAt) return null;
      const ageDays = Math.floor((nowMs - new Date(entry.followedAt).getTime()) / DAY_MS);
      if (ageDays < 1) return t('settings.followingCleanup.followedToday');
      if (ageDays === 1) return t('settings.followingCleanup.followedOneDay');
      if (ageDays < 30) return t('settings.followingCleanup.followedDays', { count: ageDays });
      const ageMonths = Math.floor(ageDays / 30);
      if (ageMonths < 12) return t('settings.followingCleanup.followedMonths', { count: ageMonths });
      const ageYears = Math.floor(ageDays / 365);
      return t('settings.followingCleanup.followedYears', { count: ageYears });
    },
    [nowMs, t],
  );

  const getStatsLabel = useCallback(
    (entry: FollowingCleanupEntry): string | null => {
      const { followersCount, followsCount, postsCount } = entry.profile;
      // Counts arrive via the getProfiles enrichment pass, which trails
      // the initial getFollows discovery. Hide the line until at least
      // one count is back so we don't render a misleading "0 followers"
      // row before enrichment lands.
      if (
        followersCount === undefined &&
        followsCount === undefined &&
        postsCount === undefined
      ) {
        return null;
      }
      return t('settings.followingCleanup.stats', {
        followers: formatCompact(followersCount ?? 0),
        follows: formatCompact(followsCount ?? 0),
        posts: formatCompact(postsCount ?? 0),
      });
    },
    [t],
  );

  return { getLastActivityLabel, getFollowedAtLabel, getStatsLabel };
}
