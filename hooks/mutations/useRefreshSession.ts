import { BlueskyApi, blueskyApi } from "@/utils/blueskyApi";
import { jwtStorage } from "@/utils/secureStorage";
import { useMutation, useQueryClient } from "@tanstack/react-query";

/**
 * Mutation hook for refreshing the Bluesky session
 * Used to renew expired access tokens
 */
export function useRefreshSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      refreshToken,
      pdsUrl,
    }: {
      /** The refresh JWT token */
      refreshToken: string;
      /** Optional custom PDS URL (defaults to bsky.social) */
      pdsUrl?: string;
    }) => {
      const api = pdsUrl ? BlueskyApi.createWithPDS(pdsUrl) : blueskyApi;
      return await api.refreshSession(refreshToken);
    },
    onSuccess: (session) => {
      // Update stored tokens
      jwtStorage.setToken(session.accessJwt);
      jwtStorage.setRefreshToken(session.refreshJwt);
      jwtStorage.setUserData(session.did, session.handle);

      // Invalidate auth queries with the new user-specific key
      queryClient.invalidateQueries({ queryKey: ["auth", session.did] });
    },
  });
}
