import { blueskyApi, type BlueskyFeedsResponse } from "@/utils/blueskyApi";
import { jwtStorage } from "@/utils/secureStorage";
import { useQuery } from "@tanstack/react-query";

/**
 * Query hook for fetching feed generators created by an actor
 * @param actor - The actor's DID or handle
 * @param limit - Number of feeds to fetch (default: 50, max: 100)
 * @param cursor - Pagination cursor
 * @param enabled - Whether the query should be enabled (default: true)
 */
export function useFeeds(
  actor: string,
  limit: number = 50,
  cursor?: string,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ["feeds", actor, limit, cursor],
    queryFn: async (): Promise<BlueskyFeedsResponse> => {
      const token = jwtStorage.getToken();
      if (!token) throw new Error("No access token");

      return await blueskyApi.getFeeds(token, actor, limit, cursor);
    },
    enabled: enabled && !!actor,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}
