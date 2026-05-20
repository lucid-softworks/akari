import { useInfiniteQuery } from '@tanstack/react-query';

import { CursorPageParam } from '@/hooks/queries/types';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { usePdsUrl } from '@/hooks/queries/usePdsUrl';
import { queryKeys } from '@/hooks/queryKeys';
import { apiForPdsUrl } from '@/utils/blueskyApi';

/**
 * Infinite query for an actor's `equipment.rpg.item` records
 * (rpg.actor inventory). Returns empty when the actor doesn't use
 * rpg.actor, so callers can auto-hide the tab.
 */
export function useRpgInventory(identifier: string | undefined, limit: number = 50) {
  const { data: token } = useJwtToken();
  const { data: targetPdsUrl, isLoading: isPdsLoading } = usePdsUrl(identifier);

  return useInfiniteQuery({
    queryKey: queryKeys.author.rpgInventory(identifier, limit, targetPdsUrl),
    queryFn: async ({ pageParam }: CursorPageParam) => {
      if (!token) throw new Error('No access token');
      if (!identifier) throw new Error('No identifier provided');
      if (!targetPdsUrl) throw new Error('No PDS URL available for target user');

      const api = apiForPdsUrl(targetPdsUrl);
      const response = await api.getActorRpgInventory(token, identifier, limit, pageParam);

      return {
        items: response.records,
        cursor: response.cursor,
      };
    },
    select: (data) => data.pages.flatMap((page) => page.items),
    enabled: !!identifier && !!token && !!targetPdsUrl && !isPdsLoading,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.cursor,
    staleTime: 5 * 60 * 1000,
  });
}
