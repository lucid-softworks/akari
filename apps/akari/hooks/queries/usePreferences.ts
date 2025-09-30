import { BlueskyApi, type BlueskyFeed, type BlueskyPreferencesResponse, type BlueskySavedFeedsPref } from '@/bluesky-api';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { SavedFeedWithMetadata } from '@/types/savedFeed';
import { feedGeneratorsQueryOptions } from './useFeedGenerators';

const PREFERENCES_STALE_TIME = 10 * 60 * 1000; // 10 minutes

export const preferencesQueryOptions = (pdsUrl: string, token?: string) => ({
  queryKey: ['preferences', pdsUrl] as const,
  queryFn: async (): Promise<BlueskyPreferencesResponse> => {
    if (!token) throw new Error('No access token');
    if (!pdsUrl) throw new Error('No PDS URL available');

    const api = new BlueskyApi(pdsUrl);
    return await api.getPreferences();
  },
  staleTime: PREFERENCES_STALE_TIME,
});

/**
 * Query hook for fetching user preferences
 */
export function usePreferences() {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useQuery({
    ...preferencesQueryOptions(currentAccount?.pdsUrl ?? '', token),
    enabled: !!currentAccount?.pdsUrl,
  });
}

/**
 * Query hook for fetching user's saved feeds from preferences with metadata
 */
export function useSavedFeeds() {
  const queryClient = useQueryClient();
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useQuery({
    queryKey: ['savedFeeds', currentAccount?.did] as const,
    enabled: !!token && !!currentAccount?.did && !!currentAccount?.pdsUrl,
    staleTime: PREFERENCES_STALE_TIME,
    queryFn: async (): Promise<SavedFeedWithMetadata[]> => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');
      if (!currentAccount?.did) throw new Error('No DID available');

      const preferences = await queryClient.ensureQueryData(
        preferencesQueryOptions(currentAccount.pdsUrl, token),
      );

      const savedFeedsPref = preferences.preferences.find(
        (pref): pref is BlueskySavedFeedsPref => pref.$type === 'app.bsky.actor.defs#savedFeedsPrefV2',
      );

      const savedFeeds = savedFeedsPref?.items ?? [];
      if (savedFeeds.length === 0) {
        return [];
      }

      const feedUris = savedFeeds.filter((feed) => feed.type === 'feed').map((feed) => feed.value);

      if (feedUris.length === 0) {
        return savedFeeds.map((savedFeed) => ({
          ...savedFeed,
          metadata: null,
        }));
      }

      const feedGenerators = await queryClient.ensureQueryData(
        feedGeneratorsQueryOptions(feedUris, currentAccount.pdsUrl, token),
      );

      const feedMetadataMap = new Map<string, BlueskyFeed>();
      for (const feed of feedGenerators.feeds) {
        feedMetadataMap.set(feed.uri, feed);
      }

      return savedFeeds.map((savedFeed) => {
        if (savedFeed.type === 'feed') {
          return {
            ...savedFeed,
            metadata: feedMetadataMap.get(savedFeed.value) ?? null,
          };
        }

        return {
          ...savedFeed,
          metadata: null,
        };
      });
    },
  });
}
