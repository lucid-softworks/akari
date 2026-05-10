import { useMemo } from 'react';

import { type BlueskyInterestsPref } from '@/bluesky-api';

import { usePreferences } from './usePreferences';

const PREF_TYPE = 'app.bsky.actor.defs#interestsPref';

/** Interest tags the user has opted into. Empty == "no preference". */
export function useInterests(): { data: string[]; isLoading: boolean } {
  const result = usePreferences() ?? {};
  const { data, isLoading = false } = result as {
    data?: { preferences: { $type: string }[] };
    isLoading?: boolean;
  };

  const tags = useMemo<string[]>(() => {
    if (!data) return [];
    const pref = data.preferences.find(
      (p): p is BlueskyInterestsPref => p.$type === PREF_TYPE,
    );
    return pref?.tags ?? [];
  }, [data]);

  return { data: tags, isLoading };
}
