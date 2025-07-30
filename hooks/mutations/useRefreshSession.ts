import { useSetAuthentication } from "@/hooks/mutations/useSetAuthentication";
import { BlueskyApi, blueskyApi } from "@/utils/blueskyApi";
import { useMutation, useQueryClient } from "@tanstack/react-query";

/**
 * Mutation hook for refreshing the Bluesky session
 * Used to renew expired access tokens
 */
export function useRefreshSession() {
  const queryClient = useQueryClient();
  const setAuthMutation = useSetAuthentication();

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
      setAuthMutation.mutate({
        token: session.accessJwt,
        refreshToken: session.refreshJwt,
        did: session.did,
        handle: session.handle,
      });

      // Invalidate auth queries with the new user-specific key
      queryClient.invalidateQueries({ queryKey: ["auth", session.did] });
    },
  });
}
