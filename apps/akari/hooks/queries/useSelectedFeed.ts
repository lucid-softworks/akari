import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useIsGuest } from '@/hooks/queries/useIsGuest';
import { queryKeys } from '@/hooks/queryKeys';
import { isMastodonFeedKey, MASTODON_HOME_FEED } from '@/utils/mastodon/feed';
import { storage } from '@/utils/secureStorage';

const DEFAULT_FEED_URI =
  'at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.generator/whats-hot';

function readSelectedFeed(): string {
  return storage.getItem('selectedFeed') ?? DEFAULT_FEED_URI;
}

/**
 * Choose the right default for the currently-active account.
 *
 * - Guests: pinned to the public discover feed; the saved-feeds endpoint
 *   is auth-only so there's nothing else they can land on.
 * - Mastodon: pinned to the home timeline sentinel. The stored value
 *   might be an `at://...` URI from a previously-signed-in atproto
 *   account (or empty), which a Mastodon-side reader couldn't interpret
 *   — we normalise to the `mastodon-home` sentinel.
 * - atproto signed-in: their persisted MMKV choice, or the default URI.
 */
function pickDefault(isGuest: boolean, isMastodon: boolean): string {
  if (isGuest) return DEFAULT_FEED_URI;
  if (isMastodon) {
    const stored = storage.getItem('selectedFeed');
    return isMastodonFeedKey(stored) ? stored : MASTODON_HOME_FEED;
  }
  return readSelectedFeed();
}

/**
 * The user's currently-selected home-feed key. MMKV is the source of
 * truth: `useSetSelectedFeed` writes the choice to the `selectedFeed`
 * key, and this hook reads it back via `initialData` so the selection
 * survives a reload.
 *
 * Format depends on the active account's protocol:
 *   - atproto: `at://…/app.bsky.feed.generator/<rkey>` or `'following'`
 *   - Mastodon: a sentinel from `utils/mastodon/feed.ts`
 * The persistence is shared by design — switching accounts overrides the
 * stored value via the effect below, so the read and write paths always
 * route to the same cache entry regardless of which protocol picked it.
 *
 * Guests get the public discover feed regardless of what's persisted —
 * `'following'` requires `getTimeline` which is auth-only, and an
 * orphaned `at://…` from a signed-in user's saved-feeds list would also
 * be unreachable.
 *
 * `meta.persist: false` opts the query out of the React Query persisted
 * cache so a stale persisted blob can't clobber the MMKV value on cold
 * start (or in another tab).
 */
export function useSelectedFeed() {
  const isGuest = useIsGuest();
  const { data: currentAccount } = useCurrentAccount();
  const isMastodon = currentAccount?.provider === 'mastodon';
  const queryClient = useQueryClient();

  // When the active account transitions to a protocol that can't read the
  // current selected-feed value (guest sign-out, atproto→Mastodon switch),
  // pin the value to the right default. Without this the home tab would
  // try to hit an `at://…` feed against a Mastodon client or vice versa.
  useEffect(() => {
    const target = pickDefault(isGuest, isMastodon);
    const current = queryClient.getQueryData<string>(queryKeys.selectedFeed());
    // atproto-signed-in users can land on any `at://…` value, so don't
    // overwrite if it looks atproto-shaped and the account is atproto.
    const needsReset =
      isGuest
        ? current !== DEFAULT_FEED_URI
        : isMastodon
          ? !isMastodonFeedKey(current)
          : isMastodonFeedKey(current);
    if (needsReset) {
      queryClient.setQueryData(queryKeys.selectedFeed(), target);
    }
  }, [isGuest, isMastodon, queryClient]);

  return useQuery({
    queryKey: queryKeys.selectedFeed(),
    queryFn: () => pickDefault(isGuest, isMastodon),
    initialData: () => pickDefault(isGuest, isMastodon),
    staleTime: Infinity,
    gcTime: Infinity,
    meta: { persist: false },
  });
}
