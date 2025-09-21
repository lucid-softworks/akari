import { useQuery } from '@tanstack/react-query';

import { BlueskyApi } from '@/bluesky-api';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';

type ProfileSearchResult = {
  did: string;
  handle: string;
  displayName: string;
  avatar?: string;
  description?: string;
};

type ProfileSearchResponse = {
  profiles: ProfileSearchResult[];
};

type ProfileSearchError = {
  type: 'permission' | 'network' | 'unknown';
  message: string;
};

export function useProfileSearch(query: string, limit: number = 10) {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();
  const trimmedQuery = query.trim();

  return useQuery<ProfileSearchResponse, ProfileSearchError>({
    queryKey: ['profileSearch', trimmedQuery, limit, currentAccount?.pdsUrl],
    queryFn: async () => {
      if (!token) throw new Error('No access token');
      if (!trimmedQuery) return { profiles: [] };
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');

      try {
        const api = new BlueskyApi(currentAccount.pdsUrl);
        const response = await api.searchProfiles(token, trimmedQuery, limit);

        const profiles = (response.actors ?? []).map((actor) => ({
          did: actor.did,
          handle: actor.handle,
          displayName: actor.displayName || actor.handle,
          avatar: actor.avatar,
          description: actor.description,
        }));

        return { profiles };
      } catch (error: unknown) {
        let errorType: ProfileSearchError['type'] = 'unknown';
        let errorMessage = 'Failed to search profiles';

        const errorObj = error as { message?: string };
        const message = errorObj?.message ?? '';

        if (message.includes('401') || message.toLowerCase().includes('unauthorized')) {
          errorType = 'permission';
          errorMessage = "Your app password doesn't have permission to search profiles";
        } else if (message.includes('403') || message.toLowerCase().includes('forbidden')) {
          errorType = 'permission';
          errorMessage = 'Access to profile search is not allowed with this app password';
        } else if (message.toLowerCase().includes('network')) {
          errorType = 'network';
          errorMessage = 'Network error. Please check your connection and try again';
        }

        const searchError: ProfileSearchError = {
          type: errorType,
          message: errorMessage,
        };

        throw searchError;
      }
    },
    enabled: trimmedQuery.length >= 2 && !!token && !!currentAccount?.pdsUrl,
    staleTime: 60 * 1000,
    retry: (failureCount, error) => {
      if (error?.type === 'permission') {
        return false;
      }

      return failureCount < 3;
    },
  });
}

export type { ProfileSearchError, ProfileSearchResult };
