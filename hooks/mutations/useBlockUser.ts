import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useJwtToken } from "@/hooks/queries/useJwtToken";
import { blueskyApi } from "@/utils/blueskyApi";

/**
 * Mutation hook for blocking and unblocking users
 */
export function useBlockUser() {
  const queryClient = useQueryClient();
  const { data: token } = useJwtToken();

  return useMutation({
    mutationFn: async ({
      did,
      blockUri,
      action,
    }: {
      /** The user's DID */
      did: string;
      /** The block URI (required for unblock) */
      blockUri?: string;
      /** Whether to block or unblock */
      action: "block" | "unblock";
    }) => {
      if (!token) throw new Error("No access token");

      if (action === "block") {
        return await blueskyApi.blockUser(token, did);
      } else {
        if (!blockUri) throw new Error("Block URI is required for unblock");
        return await blueskyApi.unblockUser(token, blockUri);
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate profile queries to refresh block status
      queryClient.invalidateQueries({ queryKey: ["profile", variables.did] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}
