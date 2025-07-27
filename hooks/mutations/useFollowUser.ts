import { useMutation, useQueryClient } from "@tanstack/react-query";

import { blueskyApi } from "@/utils/blueskyApi";
import { jwtStorage } from "@/utils/secureStorage";

/**
 * Mutation hook for following and unfollowing users
 */
export function useFollowUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      did,
      followUri,
      action,
    }: {
      /** The user's DID */
      did: string;
      /** The follow URI (required for unfollow) */
      followUri?: string;
      /** Whether to follow or unfollow */
      action: "follow" | "unfollow";
    }) => {
      const token = jwtStorage.getToken();
      if (!token) throw new Error("No access token");

      if (action === "follow") {
        return await blueskyApi.followUser(token, did);
      } else {
        if (!followUri) throw new Error("Follow URI is required for unfollow");
        return await blueskyApi.unfollowUser(token, followUri);
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate profile queries to refresh follow status
      queryClient.invalidateQueries({ queryKey: ["profile", variables.did] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}
