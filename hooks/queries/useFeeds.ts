import { useJwtToken } from "@/hooks/queries/useJwtToken";
import { blueskyApi, type BlueskyFeedsResponse } from "@/utils/blueskyApi";
import { useQuery } from "@tanstack/react-query";

/**
 * Query hook for fetching feed generators created by an actor
 * @param actor - The actor's DID or handle
 * @param limit - Number of feeds to fetch (default: 50, max: 100)
 * @param cursor - Pagination cursor
 */
export function useFeeds(
  actor: string | undefined,
  limit: number = 50,
  cursor?: string
) {
  const { data: token } = useJwtToken();

  return useQuery({
    queryKey: ["feeds", actor, limit, cursor],
    queryFn: async (): Promise<BlueskyFeedsResponse> => {
      if (!token) throw new Error("No access token");
      if (!actor) throw new Error("No actor provided");

      return await blueskyApi.getFeeds(token, actor, limit, cursor);
    },
    enabled: !!actor && !!token,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}
