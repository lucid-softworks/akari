import { useSetAuthentication } from '@/hooks/mutations/useSetAuthentication';
import { BlueskyApi } from '@/bluesky-api';
import { useMutation, useQueryClient } from '@tanstack/react-query';

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
      /** PDS URL to use for authentication */
      pdsUrl: string;
    }) => {
      const api = new BlueskyApi(pdsUrl);
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
      queryClient.invalidateQueries({ queryKey: ['auth'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}
