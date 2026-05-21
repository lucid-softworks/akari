import { useQuery } from '@tanstack/react-query';

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
 * be unreachable. Forcing the default keeps the home tab populated for
 * anyone browsing without a session.
 *
 * `meta.persist: false` opts the query out of the React Query persisted
 * cache so a stale persisted blob can't clobber the MMKV value on cold
 * start (or in another tab).
 */
export function useSelectedFeed() {
  const isGuest = useIsGuest();

  return useQuery({
    queryKey: [...queryKeys.selectedFeed(), isGuest ? 'guest' : 'authed'],
    queryFn: () => (isGuest ? DEFAULT_FEED_URI : readSelectedFeed()),
    initialData: () => (isGuest ? DEFAULT_FEED_URI : readSelectedFeed()),
    staleTime: Infinity,
    gcTime: Infinity,
    meta: { persist: false },
  });
}
