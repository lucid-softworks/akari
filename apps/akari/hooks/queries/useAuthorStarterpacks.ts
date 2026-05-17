import { useInfiniteQuery } from '@tanstack/react-query';

import {
  getActorStarterpacksPage,
  resolveIdentifierToDid,
  resolvePdsUrl,
} from '@/hooks/queries/microcosm';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { CursorPageParam } from '@/hooks/queries/types';
import { queryKeys } from '@/hooks/queryKeys';
import { useAppViewEnabled } from '@/hooks/useAppViewEnabled';
import { apiForAccount } from '@/utils/blueskyApi';
/**
 * Infinite query hook for fetching starterpacks created by a user
 * @param identifier - The user's handle or DID
 * @param limit - Number of starterpacks to fetch per page (default: 50)
 */
export function useAuthorStarterpacks(identifier: string | undefined, limit: number = 50) {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();
  const appViewEnabled = useAppViewEnabled();

  return useInfiniteQuery({
    queryKey: queryKeys.author.starterpacks(identifier, limit, currentAccount?.pdsUrl, appViewEnabled),
    queryFn: async ({ pageParam }: CursorPageParam) => {
      if (!identifier) throw new Error('No identifier provided');

      if (!appViewEnabled) {
        const did = await resolveIdentifierToDid(identifier);
        const pdsUrl =
          currentAccount?.did === did ? currentAccount?.pdsUrl : await resolvePdsUrl(did);
        if (!pdsUrl) throw new Error(`Couldn't resolve PDS URL for ${did}`);
        const page = await getActorStarterpacksPage({ did, pdsUrl, limit, cursor: pageParam });
        return { starterpacks: page.starterPacks, cursor: page.cursor };
      }

      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');

      const api = apiForAccount(currentAccount);
      const starterpacks = await api.getAuthorStarterpacks(token, identifier, limit, pageParam);

      return {
        starterpacks: starterpacks.starterPacks,
        cursor: starterpacks.cursor,
      };
    },
    select: (data) => data.pages.flatMap((page) => page.starterpacks),
    enabled: !!identifier && (appViewEnabled ? !!token : true),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.cursor,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
