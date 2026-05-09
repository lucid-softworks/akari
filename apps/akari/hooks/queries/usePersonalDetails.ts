import { useMemo } from 'react';

import { type BlueskyPersonalDetailsPref } from '@/bluesky-api';

import { usePreferences } from './usePreferences';

const PERSONAL_DETAILS_PREF_TYPE = 'app.bsky.actor.defs#personalDetailsPref';

/** Reads `personalDetailsPref` from the user's preferences blob. */
export function usePersonalDetails(): { birthDate?: string; isLoading: boolean } {
  const result = usePreferences() ?? {};
  const { data, isLoading = false } = result as {
    data?: { preferences: { $type: string }[] };
    isLoading?: boolean;
  };

  const birthDate = useMemo<string | undefined>(() => {
    if (!data) return undefined;
    const pref = data.preferences.find(
      (p): p is BlueskyPersonalDetailsPref => p.$type === PERSONAL_DETAILS_PREF_TYPE,
    );
    return pref?.birthDate;
  }, [data]);

  return { birthDate, isLoading };
}
