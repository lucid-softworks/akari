import { blueskyApi, type BlueskyFeedResponse } from "@/utils/blueskyApi";
import { jwtStorage } from "@/utils/secureStorage";
import { useQuery } from "@tanstack/react-query";

/**
 * Query hook for fetching posts from a specific feed generator
 * @param feed - The feed's URI
 * @param limit - Number of posts to fetch (default: 50, max: 100)
 * @param cursor - Pagination cursor
 * @param enabled - Whether the query should be enabled (default: true)
 */
export function useFeed(
  feed: string,
  limit: number = 50,
  cursor?: string,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ["feed", feed, limit, cursor],
    queryFn: async (): Promise<BlueskyFeedResponse> => {
      const token = jwtStorage.getToken();
      if (!token) throw new Error("No access token");

      return await blueskyApi.getFeed(token, feed, limit, cursor);
    },
    enabled: enabled && !!feed,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
