import { blueskyApi } from "@/utils/blueskyApi";
import { jwtStorage } from "@/utils/secureStorage";
import { useQuery } from "@tanstack/react-query";

/**
 * Query hook for fetching the user's timeline feed
 * @param limit - Number of posts to fetch (default: 20)
 * @param enabled - Whether the query should be enabled (default: true)
 */
export function useTimeline(limit: number = 20, enabled: boolean = true) {
  return useQuery({
    queryKey: ["timeline", limit],
    queryFn: async () => {
      const token = jwtStorage.getToken();
      if (!token) throw new Error("No access token");

      return await blueskyApi.getTimeline(token, limit);
    },
    enabled: enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
