import { useInfiniteQuery } from '@tanstack/react-query';

import { useAcceptLabelerDids } from '@/hooks/queries/useAcceptLabelerDids';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { CursorPageParam } from '@/hooks/queries/types';
import { queryKeys } from '@/hooks/queryKeys';
import { useAppViewEnabled } from '@/hooks/useAppViewEnabled';
import { apiForAccount, apiForPublicAppView } from '@/utils/blueskyApi';

/**
 * Infinite query for posts the user has reposted. Walks the author
 * feed and keeps entries whose `reason` is a `reasonRepost` (i.e. the
 * actor reposted someone else's post). The post we return is the
 * ORIGINAL post — the repost record itself is just the route through
 * the actor's feed.
 *
 * @param identifier - The actor's handle or DID
 * @param limit - Posts per page (default: 50)
 */
export function useAuthorReposts(identifier: string | undefined, limit: number = 50) {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();
  const appViewEnabled = useAppViewEnabled();
  const acceptLabelers = useAcceptLabelerDids();

  return useInfiniteQuery({
    queryKey: queryKeys.author.reposts(identifier, limit, currentAccount?.pdsUrl, appViewEnabled),
    queryFn: async ({ pageParam }: CursorPageParam) => {
      if (!identifier) throw new Error('No identifier provided');

      const useGuestPath = !token || !currentAccount?.pdsUrl;
      const api = useGuestPath ? apiForPublicAppView() : apiForAccount(currentAccount);
      const feed = await api.getAuthorFeed(
        useGuestPath ? '' : token,
        identifier,
        limit,
        pageParam,
        undefined,
        acceptLabelers,
      );

      const reposts = feed.feed.flatMap((item) => {
        const reason = item.reason as { $type?: string } | undefined;
        if (reason?.$type !== 'app.bsky.feed.defs#reasonRepost') return [];
        return [item.post];
      });

      // Deduplicate by URI — different feed pages can surface the
      // same post if the actor reposted the same item more than once.
      const uniqueReposts = reposts.filter(
        (post, index, self) => index === self.findIndex((p) => p.uri === post.uri),
      );

      return {
        reposts: uniqueReposts,
        cursor: feed.cursor,
      };
    },
    select: (data) => data.pages.flatMap((page) => page.reposts),
    enabled: !!identifier,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.cursor,
    staleTime: 5 * 60 * 1000,
  });
}
