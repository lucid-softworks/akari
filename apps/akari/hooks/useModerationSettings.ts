import { useCallback } from 'react';

import { type BlueskyAdultContentPref } from '@/bluesky-api';
import { useUpdateAdultContentPref } from '@/hooks/mutations/useUpdateAdultContentPref';
import { usePreferences } from '@/hooks/queries/usePreferences';

const ADULT_CONTENT_PREF_TYPE = 'app.bsky.actor.defs#adultContentPref';

/**
 * Reads the user's adult-content preference from atproto preferences
 * (`app.bsky.actor.defs#adultContentPref`) and exposes a setter that
 * round-trips through `putPreferences`. The choice now follows the user
 * across clients — there is no separate local MMKV cache.
 *
 * Returns `false` while the preferences query is loading or if the user
 * has never explicitly set the preference, matching atproto's
 * "off by default" behaviour.
 */
export function useModerationSettings() {
  const prefs = usePreferences();
  const update = useUpdateAdultContentPref();

  const adultContentEnabled =
    prefs.data?.preferences.find(
      (p): p is BlueskyAdultContentPref => p.$type === ADULT_CONTENT_PREF_TYPE,
    )?.enabled ?? false;

  const setAdultContentEnabled = useCallback(
    (enabled: boolean) => {
      update.mutate(enabled);
    },
    [update],
  );

  return {
    adultContentEnabled,
    setAdultContentEnabled,
    isLoading: prefs.isLoading,
    isSaving: update.isPending,
  };
}
