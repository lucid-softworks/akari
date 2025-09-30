import { useQuery } from "@tanstack/react-query";

import { useJwtToken } from "@/hooks/queries/useJwtToken";
import { BlueskyApi } from "@/bluesky-api";
import { useCurrentAccount } from "./useCurrentAccount";

/**
 * Query hook for fetching a user's profile information
 * @param identifier - The user's handle or DID
 */
export function useProfile(identifier: string | undefined) {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useQuery({
    queryKey: ["profile", identifier, currentAccount?.pdsUrl],
    queryFn: async () => {
      if (!token) throw new Error("No access token");
      if (!identifier) throw new Error("No identifier provided");
      if (!currentAccount?.pdsUrl) throw new Error("No PDS URL available");

      const api = new BlueskyApi(currentAccount.pdsUrl);
      const profile = await api.getProfile(identifier);

      return profile;
    },
    enabled: !!identifier && !!token,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
