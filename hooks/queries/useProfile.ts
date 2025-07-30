import { useQuery } from "@tanstack/react-query";

import { useJwtToken } from "@/hooks/queries/useJwtToken";
import { blueskyApi } from "@/utils/blueskyApi";

/**
 * Query hook for fetching a user's profile information
 * @param identifier - The user's handle or DID
 */
export function useProfile(identifier: string | undefined) {
  const { data: token } = useJwtToken();

  return useQuery({
    queryKey: ["profile", identifier],
    queryFn: async () => {
      if (!token) throw new Error("No access token");
      if (!identifier) throw new Error("No identifier provided");

      const profile = await blueskyApi.getProfile(token, identifier);

      return profile;
    },
    enabled: !!identifier && !!token,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
