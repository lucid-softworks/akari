import { useInfiniteQuery } from '@tanstack/react-query';

import { BlueskyApi, getPdsUrlFromDid } from '@/bluesky-api';
import { CursorPageParam } from '@/hooks/queries/types';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useProfile } from '@/hooks/queries/useProfile';

/**
 * Infinite query hook for fetching a user's blue.linkat.board records
 * @param identifier - The user's handle or DID
 * @param limit - Number of records to fetch per page (default: 20)
 */
export function useLinks(identifier: string | undefined, limit: number = 20) {
  const { data: token } = useJwtToken();
  const { data: profile } = useProfile(identifier);

  return useInfiniteQuery({
    queryKey: ['links', identifier, limit, profile?.did],
    queryFn: async ({ pageParam }: CursorPageParam) => {
      if (!token) throw new Error('No access token');
      if (!identifier) throw new Error('No identifier provided');
      if (!profile?.did) throw new Error('No profile DID available');

      // Get the target user's PDS URL from their DID
      const targetPdsUrl = await getPdsUrlFromDid(profile.did);
      if (!targetPdsUrl) {
        throw new Error('Could not determine PDS URL for user');
      }

      const api = new BlueskyApi(targetPdsUrl);
      const response = await api.getActorLinkatBoards(token, profile.did, limit, pageParam);

      return {
        links: response.records || [],
        cursor: response.cursor,
      };
    },
    select: (data) => data.pages.flatMap((page) => page.links),
    enabled: !!identifier && !!token && !!profile?.did,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.cursor,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
