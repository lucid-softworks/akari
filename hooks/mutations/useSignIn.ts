import { BlueskyApi, blueskyApi } from "@/utils/blueskyApi";
import { jwtStorage } from "@/utils/secureStorage";
import { useMutation, useQueryClient } from "@tanstack/react-query";

/**
 * Mutation hook for signing in to Bluesky
 * Handles authentication and stores tokens securely
 */
export function useSignIn() {
  const queryClient = useQueryClient();

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
    onSuccess: (session) => {
      // Store tokens securely
      jwtStorage.setToken(session.accessJwt);
      jwtStorage.setRefreshToken(session.refreshJwt);
      jwtStorage.setUserData(session.did, session.handle);

      // Invalidate and refetch auth-related queries
      queryClient.invalidateQueries({ queryKey: ["auth"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}
