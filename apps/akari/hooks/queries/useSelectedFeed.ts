import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useIsGuest } from '@/hooks/queries/useIsGuest';
import { queryKeys } from '@/hooks/queryKeys';
import { storage } from '@/utils/secureStorage';

const DEFAULT_FEED_URI =
  'at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.generator/whats-hot';

function readSelectedFeed(): string {
  return storage.getItem('selectedFeed') ?? DEFAULT_FEED_URI;
}

/**
 * The user's currently-selected feed URI (or `'following'` for the chrono
 * timeline). MMKV is the source of truth: `useSetSelectedFeed` writes the
 * choice to the `selectedFeed` key, and this hook reads it back via
 * `initialData` so the selection survives a reload.
 *
 * Guests get the public discover feed regardless of what's persisted —
 * `'following'` requires `getTimeline` which is auth-only, and an
 * orphaned `at://…` from a signed-in user's saved-feeds list would also
 * be unreachable. The guest override is applied via an effect that
 * pins the query value to the default when `isGuest` flips on, so the
 * query *key* stays stable — `useSetSelectedFeed` writes to
 * `queryKeys.selectedFeed()` directly, and adding a `'guest' | 'authed'`
 * suffix here would silently break tab switching by routing the read
 * and the write to different cache entries.
 *
 * `meta.persist: false` opts the query out of the React Query persisted
 * cache so a stale persisted blob can't clobber the MMKV value on cold
 * start (or in another tab).
 */
export function useSelectedFeed() {
  const isGuest = useIsGuest();
  const queryClient = useQueryClient();

  // When the session transitions to guest mid-session (sign-out), pin
  // the selected feed back to discover so the home tab doesn't try to
  // hit `getTimeline` against a guest API client.
  useEffect(() => {
    if (!isGuest) return;
    const current = queryClient.getQueryData<string>(queryKeys.selectedFeed());
    if (current !== DEFAULT_FEED_URI) {
      queryClient.setQueryData(queryKeys.selectedFeed(), DEFAULT_FEED_URI);
    }
  }, [isGuest, queryClient]);

  return useQuery({
    queryKey: queryKeys.selectedFeed(),
    queryFn: () => (isGuest ? DEFAULT_FEED_URI : readSelectedFeed()),
    initialData: () => (isGuest ? DEFAULT_FEED_URI : readSelectedFeed()),
    staleTime: Infinity,
    gcTime: Infinity,
    meta: { persist: false },
  });
}
