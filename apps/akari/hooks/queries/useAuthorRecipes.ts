import { useInfiniteQuery } from '@tanstack/react-query';

import { BlueskyApi } from '@/bluesky-api';
import { CursorPageParam } from '@/hooks/queries/types';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { usePdsUrl } from '@/hooks/queries/usePdsUrl';

/**
 * Infinite query hook for fetching recipe records created by a user
 * @param identifier - The user's handle or DID
 * @param limit - Number of recipes to fetch per page (default: 50)
 */
export function useAuthorRecipes(identifier: string | undefined, limit: number = 50) {
  const { data: token } = useJwtToken();
  const { data: targetPdsUrl, isLoading: isPdsLoading } = usePdsUrl(identifier);

  return useInfiniteQuery({
    queryKey: ['authorRecipes', identifier, limit, targetPdsUrl],
    queryFn: async ({ pageParam }: CursorPageParam) => {
      if (!token) throw new Error('No access token');
      if (!identifier) throw new Error('No identifier provided');
      if (!targetPdsUrl) throw new Error('No PDS URL available for target user');

      const api = new BlueskyApi(targetPdsUrl);
      const recipes = await api.getActorRecipes(token, identifier, limit, pageParam);

      return {
        recipes: recipes.records,
        cursor: recipes.cursor,
      };
    },
    select: (data) => data.pages.flatMap((page) => page.recipes),
    enabled: !!identifier && !!token && !!targetPdsUrl && !isPdsLoading,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.cursor,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
