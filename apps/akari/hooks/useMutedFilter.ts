import { useMemo } from 'react';

import type { BlueskyPostView } from '@/bluesky-api';
import { useMutedWords } from '@/hooks/queries/useMutedWords';
import { filterMutedPosts } from '@/utils/mutedWordsFilter';

/**
 * Composition hook for feed renderers: takes the raw post list, applies the
 * user's muted-words preference, and returns the filtered list.
 *
 * Pulls the muted-words list from the cached `getPreferences` response and
 * filters in-memory. The list is React-Query-cached, so this is cheap to
 * call from every renderer.
 *
 * NOTE: `actorTarget: 'exclude-following'` rules are currently treated as
 * `'all'` because we don't have a viewer-followed-DIDs set wired up. When
 * that's added, pass it as `followingDids` here.
 */
export function useMutedFilter<T extends BlueskyPostView>(posts: readonly T[] | undefined): T[] {
  const { data: mutedWords } = useMutedWords();

  return useMemo(() => {
    if (!posts) return [];
    if (!mutedWords?.length) return posts.slice();
    return filterMutedPosts(posts, mutedWords);
  }, [posts, mutedWords]);
}
