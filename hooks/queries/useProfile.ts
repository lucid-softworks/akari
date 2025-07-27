import { blueskyApi } from "@/utils/blueskyApi";
import { jwtStorage } from "@/utils/secureStorage";
import { useQuery } from "@tanstack/react-query";

/**
 * Query hook for fetching a user's profile information
 * @param did - The user's Decentralized Identifier (DID)
 * @param enabled - Whether the query should be enabled (default: true)
 */
export function useProfile(did: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ["profile", did],
    queryFn: async () => {
      const token = jwtStorage.getToken();
      if (!token) throw new Error("No access token");

      return await blueskyApi.getProfile(token, did);
    },
    enabled: enabled && !!did,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
