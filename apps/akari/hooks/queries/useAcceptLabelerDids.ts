import { useMemo } from 'react';

import { type BlueskyLabelersPref } from '@/bluesky-api';
import { usePreferences } from '@/hooks/queries/usePreferences';

/**
 * Reads the signed-in user's subscribed labeler DIDs from their
 * `app.bsky.actor.defs#labelersPref` preference. Used to populate the
 * `atproto-accept-labelers` header on post-fetching endpoints so the
 * AppView applies labels from the right labelers.
 *
 * Returns a stable array reference (memoised on the preferences result)
 * so callers can drop it into `useQuery` query keys without forcing
 * an extra refetch each render.
 */
export function useAcceptLabelerDids(): string[] {
  const { data: preferences } = usePreferences();

  return useMemo(() => {
    if (!preferences?.preferences) return [];
    const dids: string[] = [];
    for (const pref of preferences.preferences) {
      if (pref.$type === 'app.bsky.actor.defs#labelersPref') {
        for (const entry of (pref as BlueskyLabelersPref).labelers) {
          if (entry.did) dids.push(entry.did);
        }
      }
    }
    return dids;
  }, [preferences]);
}
