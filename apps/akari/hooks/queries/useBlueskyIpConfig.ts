import { useQuery } from "@tanstack/react-query";

import { getBlueskyIpConfig } from "@/bluesky-api";

/**
 * Query hook for fetching the Bluesky IP configuration used for age restrictions
 */
export function useBlueskyIpConfig() {
  return useQuery({
    queryKey: ["blueskyIpConfig"],
    queryFn: getBlueskyIpConfig,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
