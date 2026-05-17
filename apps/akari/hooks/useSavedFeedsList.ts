import { useMemo } from 'react';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useFeeds } from '@/hooks/queries/useFeeds';
import { useSavedFeeds } from '@/hooks/queries/usePreferences';

/**
 * Resolves the user's saved feeds preference into a flat list of feed
 * metadata objects, expanding the synthetic "following" timeline entry into
 * a feed-shaped record and concatenating any feeds the user owns.
 */
export function useSavedFeedsList() {
  const { data: currentAccount } = useCurrentAccount();
  const { data: savedFeeds, isLoading: savedFeedsLoading } = useSavedFeeds();
  const { data: feedsData, isLoading: feedsLoading, refetch: refetchFeeds } = useFeeds(currentAccount?.did, 50);

  const allFeeds = useMemo(() => {
    // oxlint-disable-next-line react-doctor/js-combine-iterations -- .filter() uses a type predicate to narrow the union; flattening would break inference
    return (savedFeeds ?? [])
      .map((savedFeed) => {
        if (savedFeed.type === 'timeline' && savedFeed.value === 'following') {
          return {
            uri: 'following',
            displayName: 'Following',
            description: 'Posts from people you follow',
            likeCount: 0,
            acceptsInteractions: true,
            contentMode: 'app.bsky.feed.defs#contentModeUnspecified' as const,
            indexedAt: new Date().toISOString(),
            creator: {
              did: currentAccount?.did || '',
              handle: currentAccount?.handle || '',
              displayName: 'You',
              description: 'Your timeline',
              avatar: '',
              associated: {
                lists: 0,
                feedgens: 0,
                starterPacks: 0,
                labeler: false,
                chat: { allowIncoming: 'all' as const },
              },
              indexedAt: new Date().toISOString(),
              createdAt: new Date().toISOString(),
              viewer: {
                muted: false,
                blockedBy: false,
              },
              labels: [],
            },
            labels: [],
          };
        }

        if (savedFeed.type === 'feed' && savedFeed.metadata) {
          return savedFeed.metadata;
        }

        return null;
      })
      .filter((feed): feed is NonNullable<typeof feed> => feed !== null);
  }, [currentAccount?.did, currentAccount?.handle, savedFeeds]);

  const allFeedsWithCreated = useMemo(() => {
    return [...allFeeds, ...(feedsData?.feeds ?? [])];
  }, [allFeeds, feedsData]);

  return {
    allFeedsWithCreated,
    savedFeedsLoading,
    feedsLoading,
    refetchFeeds,
  };
}
