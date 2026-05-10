import { useMemo } from 'react';

import { type BlueskyThreadViewPref } from '@/bluesky-api';

import { usePreferences } from './usePreferences';

const PREF_TYPE = 'app.bsky.actor.defs#threadViewPref';

export type ThreadSort = 'oldest' | 'newest' | 'most-likes' | 'random' | 'hotness';

export type ThreadPreferences = {
  sort: ThreadSort;
  prioritizeFollowedUsers: boolean;
};

const DEFAULTS: ThreadPreferences = {
  sort: 'hotness',
  prioritizeFollowedUsers: false,
};

/** Decoded view of `threadViewPref`. Falls back to atproto's defaults. */
export function useThreadPreferences(): { data: ThreadPreferences; isLoading: boolean } {
  const result = usePreferences() ?? {};
  const { data, isLoading = false } = result as {
    data?: { preferences: { $type: string }[] };
    isLoading?: boolean;
  };

  const decoded = useMemo<ThreadPreferences>(() => {
    if (!data) return DEFAULTS;
    const pref = data.preferences.find(
      (p): p is BlueskyThreadViewPref => p.$type === PREF_TYPE,
    );
    if (!pref) return DEFAULTS;
    return {
      sort: pref.sort ?? DEFAULTS.sort,
      prioritizeFollowedUsers: pref.prioritizeFollowedUsers ?? DEFAULTS.prioritizeFollowedUsers,
    };
  }, [data]);

  return { data: decoded, isLoading };
}
