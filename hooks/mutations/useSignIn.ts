import { useSetAuthentication } from "@/hooks/mutations/useSetAuthentication";
import { BlueskyApi, blueskyApi } from "@/utils/blueskyApi";
import { useMutation, useQueryClient } from "@tanstack/react-query";

/**
 * Mutation hook for signing in to Bluesky
 * Handles authentication and stores tokens securely
 */
export function useSignIn() {
  const queryClient = useQueryClient();
  const setAuthMutation = useSetAuthentication();

  return useMutation({
    mutationFn: async ({
      identifier,
      password,
      pdsUrl,
    }: {
      /** User's handle or email address */
      identifier: string;
      /** App password from Bluesky settings */
      password: string;
      /** Optional custom PDS URL (defaults to bsky.social) */
      pdsUrl?: string;
    }) => {
      const api = pdsUrl ? BlueskyApi.createWithPDS(pdsUrl) : blueskyApi;
      return await api.createSession(identifier, password);
    },
    onSuccess: async (session) => {
      // Store tokens securely - await to prevent race conditions
      await setAuthMutation.mutateAsync({
        token: session.accessJwt,
        refreshToken: session.refreshJwt,
        did: session.did,
        handle: session.handle,
      });

      // Invalidate all auth-related queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["auth"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}
