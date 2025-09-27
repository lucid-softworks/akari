import {
  BlueskyApi,
  type BlueskyApiClientOptions,
  type BlueskyFeed,
  type BlueskyPreferencesResponse,
  type BlueskySavedFeedsPref,
} from '@/bluesky-api';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { SavedFeedWithMetadata } from '@/types/savedFeed';
import { feedGeneratorsQueryOptions } from './useFeedGenerators';
import { useAuthenticatedBluesky } from '@/hooks/useAuthenticatedBluesky';

const PREFERENCES_STALE_TIME = 10 * 60 * 1000; // 10 minutes

export const preferencesQueryOptions = (
  token: string,
  pdsUrl: string,
  apiOptions: BlueskyApiClientOptions,
) => ({
  queryKey: ['preferences', pdsUrl] as const,
  queryFn: async (): Promise<BlueskyPreferencesResponse> => {
    if (!token) throw new Error('No access token');
    if (!pdsUrl) throw new Error('No PDS URL available');

    const api = new BlueskyApi(pdsUrl, apiOptions);
    return await api.getPreferences(token);
  },
  staleTime: PREFERENCES_STALE_TIME,
});

/**
 * Query hook for fetching user preferences
 */
export function usePreferences() {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();
  const apiOptions = useAuthenticatedBluesky();

  return useQuery({
    ...preferencesQueryOptions(token ?? '', currentAccount?.pdsUrl ?? '', apiOptions),
    enabled: !!token && !!currentAccount?.pdsUrl,
  });
}

/**
 * Query hook for fetching user's saved feeds from preferences with metadata
 */
export function useSavedFeeds() {
  const queryClient = useQueryClient();
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();
  const apiOptions = useAuthenticatedBluesky();

  return useQuery({
    queryKey: ['savedFeeds', currentAccount?.did] as const,
    enabled: !!token && !!currentAccount?.did && !!currentAccount?.pdsUrl,
    staleTime: PREFERENCES_STALE_TIME,
    queryFn: async (): Promise<SavedFeedWithMetadata[]> => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');
      if (!currentAccount?.did) throw new Error('No DID available');

      const preferences = await queryClient.ensureQueryData(
        preferencesQueryOptions(token, currentAccount.pdsUrl, apiOptions),
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
        feedGeneratorsQueryOptions(feedUris, token, currentAccount.pdsUrl, apiOptions),
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
