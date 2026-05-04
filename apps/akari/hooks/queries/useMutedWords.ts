import { useMemo } from 'react';

import type { BlueskyMutedWord, BlueskyMutedWordsPref } from '@/bluesky-api';

import { usePreferences } from './usePreferences';

const MUTED_WORDS_PREF_TYPE = 'app.bsky.actor.defs#mutedWordsPref';

/**
 * Extract the user's `mutedWordsPref` from the preferences feed and return its
 * items. Returns an empty array when the user has no muted words yet.
 */
export function useMutedWords(): {
  data: BlueskyMutedWord[];
  isLoading: boolean;
  isError: boolean;
} {
  // Defensive against jest auto-mocks of `usePreferences` that return
  // `undefined` instead of a query result object.
  const result = usePreferences() ?? {};
  const { data, isLoading = false, isError = false } = result as {
    data?: { preferences: { $type: string }[] };
    isLoading?: boolean;
    isError?: boolean;
  };

  const items = useMemo<BlueskyMutedWord[]>(() => {
    if (!data) return [];
    const pref = data.preferences.find(
      (p): p is BlueskyMutedWordsPref => p.$type === MUTED_WORDS_PREF_TYPE,
    );
    return pref?.items ?? [];
  }, [data]);

  return { data: items, isLoading, isError };
}
