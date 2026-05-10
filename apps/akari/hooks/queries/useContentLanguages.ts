import { useMemo } from 'react';

import { type BlueskyContentLanguagesPref } from '@/bluesky-api';

import { usePreferences } from './usePreferences';

const PREF_TYPE = 'app.bsky.actor.defs#contentLanguagesPref';

/** BCP-47 codes the user wants their feeds filtered to. Empty == "all". */
export function useContentLanguages(): { data: string[]; isLoading: boolean } {
  const result = usePreferences() ?? {};
  const { data, isLoading = false } = result as {
    data?: { preferences: { $type: string }[] };
    isLoading?: boolean;
  };

  const languages = useMemo<string[]>(() => {
    if (!data) return [];
    const pref = data.preferences.find(
      (p): p is BlueskyContentLanguagesPref => p.$type === PREF_TYPE,
    );
    return pref?.languages ?? [];
  }, [data]);

  return { data: languages, isLoading };
}
