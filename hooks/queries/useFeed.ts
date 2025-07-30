import { useInfiniteQuery } from "@tanstack/react-query";

import { useJwtToken } from "@/hooks/queries/useJwtToken";
import { blueskyApi } from "@/utils/blueskyApi";

/**
 * Infinite query hook for fetching feed posts
 * @param feedUri - The feed URI to fetch posts from
 * @param limit - Number of posts to fetch per page (default: 20)
 */
export function useFeed(
  feedUri: string | null,
  limit: number = 20
) {
  const { data: token } = useJwtToken();

  return useInfiniteQuery({
    queryKey: ["feed", feedUri],
    queryFn: async ({ pageParam }: { pageParam: string | undefined }) => {
      if (!token) throw new Error("No access token");
      if (!feedUri) throw new Error("No feed URI provided");

      return await blueskyApi.getFeed(token, feedUri, limit, pageParam);
    },
    enabled: !!feedUri && !!token,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.cursor,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
