import { BlueskyApi, type BlueskyFeed, type BlueskyPreferencesResponse, type BlueskySavedFeedsPref } from '@/bluesky-api';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useQuery } from '@tanstack/react-query';
import { useFeedGenerators } from './useFeedGenerators';

/**
 * Query hook for fetching user preferences
 */
export function usePreferences() {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useQuery({
    queryKey: ['preferences', currentAccount?.pdsUrl],
    queryFn: async (): Promise<BlueskyPreferencesResponse> => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');

      const api = new BlueskyApi(currentAccount.pdsUrl);
      return await api.getPreferences(token);
    },
    enabled: !!token && !!currentAccount?.pdsUrl,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Query hook for fetching user's saved feeds from preferences with metadata
 */
export function useSavedFeeds() {
  const { data: preferences, isLoading: preferencesLoading, error: preferencesError } = usePreferences();

  const savedFeedsPref = preferences?.preferences.find(
    (pref): pref is BlueskySavedFeedsPref => pref.$type === 'app.bsky.actor.defs#savedFeedsPrefV2',
  );

  const savedFeeds = savedFeedsPref?.items || [];

  // Extract feed URIs (not timeline feeds)
  const feedUris = savedFeeds.filter((feed) => feed.type === 'feed').map((feed) => feed.value);

  // Fetch metadata for custom feeds
  const { data: feedGeneratorsData, isLoading: feedGeneratorsLoading } = useFeedGenerators(feedUris);

  // Create a map of URI to feed metadata
  const feedMetadataMap = new Map<string, BlueskyFeed>();
  feedGeneratorsData?.feeds.forEach((feed) => {
    feedMetadataMap.set(feed.uri, feed);
  });

  // Combine saved feeds with their metadata
  const feedsWithMetadata = savedFeeds.map((savedFeed) => {
    if (savedFeed.type === 'timeline') {
      return {
        ...savedFeed,
        metadata: null, // Timeline feeds don't have metadata
      };
    } else {
      return {
        ...savedFeed,
        metadata: feedMetadataMap.get(savedFeed.value) || null,
      };
    }
  });

  return {
    data: feedsWithMetadata,
    isLoading: preferencesLoading || feedGeneratorsLoading,
    error: preferencesError,
  };
}
