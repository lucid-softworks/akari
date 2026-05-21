import {
  getActorFeedsPage,
  resolveIdentifierToDid,
  resolvePdsUrl,
} from '@/hooks/queries/microcosm';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { queryKeys } from '@/hooks/queryKeys';
import { useAppViewEnabled } from '@/hooks/useAppViewEnabled';
import { type BlueskyFeedsResponse } from '@/bluesky-api';
import { useQuery } from '@tanstack/react-query';
import { apiForAccount, apiForPublicAppView } from '@/utils/blueskyApi';

/**
 * Query hook for fetching feed generators created by an actor
 * @param actor - The actor's DID or handle
 * @param limit - Number of feeds to fetch (default: 50, max: 100)
 * @param cursor - Pagination cursor
 */
export function useFeeds(actor: string | undefined, limit: number = 50, cursor?: string) {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();
  const appViewEnabled = useAppViewEnabled();

  return useQuery({
    queryKey: queryKeys.feeds({ actor, limit, cursor, pdsUrl: currentAccount?.pdsUrl, appViewEnabled }),
    queryFn: async (): Promise<BlueskyFeedsResponse> => {
      if (!actor) throw new Error('No actor provided');

      if (!appViewEnabled) {
        const did = await resolveIdentifierToDid(actor);
        const pdsUrl =
          currentAccount?.did === did ? currentAccount?.pdsUrl : await resolvePdsUrl(did);
        if (!pdsUrl) throw new Error(`Couldn't resolve PDS URL for ${did}`);
        return getActorFeedsPage({ did, pdsUrl, limit, cursor });
      }

      // Guest path: read via the public AppView when no session.
      if (!token || !currentAccount?.pdsUrl) {
        const api = apiForPublicAppView();
        return await api.getFeeds('', actor, limit, cursor);
      }

      const api = apiForAccount(currentAccount);
      return await api.getFeeds(token, actor, limit, cursor);
    },
    enabled: !!actor,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}
