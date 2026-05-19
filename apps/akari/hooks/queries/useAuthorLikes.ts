import { useInfiniteQuery } from '@tanstack/react-query';

import { useAcceptLabelerDids } from '@/hooks/queries/useAcceptLabelerDids';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { CursorPageParam } from '@/hooks/queries/types';
import { queryKeys } from '@/hooks/queryKeys';
import { apiForAccount } from '@/utils/blueskyApi';
/**
 * Infinite query hook for fetching posts that a user has liked
 * @param identifier - The user's handle or DID
 * @param limit - Number of posts to fetch per page (default: 20)
 */
export function useAuthorLikes(identifier: string | undefined, limit: number = 20) {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();
  const acceptLabelers = useAcceptLabelerDids();

  return useInfiniteQuery({
    queryKey: queryKeys.author.likes.list(identifier, limit, currentAccount?.pdsUrl),
    queryFn: async ({ pageParam }: CursorPageParam) => {
      if (!token) throw new Error('No access token');
      if (!identifier) throw new Error('No identifier provided');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');

      const api = apiForAccount(currentAccount);
      const feed = await api.getAuthorFeed(token, identifier, limit, pageParam, undefined, acceptLabelers);

      // Filter to only show posts that the user has liked
      const likes = feed.feed.flatMap((item) => (item.post.viewer?.like ? [item.post] : []));

      // Deduplicate posts by URI to prevent duplicate keys
      const uniqueLikes = likes.filter((post, index, self) => index === self.findIndex((p) => p.uri === post.uri));

      return {
        likes: uniqueLikes,
        cursor: feed.cursor,
      };
    },
    select: (data) => data.pages.flatMap((page) => page.likes),
    enabled: !!identifier && !!token,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.cursor,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
