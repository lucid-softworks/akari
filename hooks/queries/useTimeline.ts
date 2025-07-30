import { useCurrentAccount } from "@/hooks/queries/useCurrentAccount";
import { useJwtToken } from "@/hooks/queries/useJwtToken";
import { blueskyApi } from "@/utils/blueskyApi";
import { useQuery } from "@tanstack/react-query";

/**
 * Query hook for fetching the user's timeline feed
 * @param limit - Number of posts to fetch (default: 20)
 * @param enabled - Whether the query should be enabled (default: true)
 */
export function useTimeline(limit: number = 20, enabled: boolean = true) {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();
  const currentUserDid = currentAccount?.did;

  return useQuery({
    queryKey: ["timeline", limit, currentUserDid],
    queryFn: async () => {
      if (!token) throw new Error("No access token");

      return await blueskyApi.getTimeline(token, limit);
    },
    enabled: enabled && !!token && !!currentUserDid,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
