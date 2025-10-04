import { useSetAuthentication } from '@/hooks/mutations/useSetAuthentication';
import { BlueskyApi } from '@/bluesky-api';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { BlueskyProfileResponse, BlueskySession } from '@/bluesky-api';

/**
 * Mutation hook for signing in to Bluesky
 * Handles authentication and stores tokens securely
 */
type SignInVariables = {
  /** User's handle or email address */
  identifier: string;
  /** App password from Bluesky settings */
  password: string;
  /** PDS URL to use for authentication */
  pdsUrl: string;
};

type SignInResult = BlueskySession & {
  profile: BlueskyProfileResponse | null;
  pdsUrl: string;
};

export function useSignIn() {
  const queryClient = useQueryClient();
  const setAuthMutation = useSetAuthentication();

  return useMutation({
    mutationFn: async ({ identifier, password, pdsUrl }: SignInVariables): Promise<SignInResult> => {
      const api = new BlueskyApi(pdsUrl);
      const session = await api.createSession(identifier, password);

      let profile: BlueskyProfileResponse | null = null;

      try {
        profile = await api.getProfile(session.accessJwt, session.did);
      } catch {
        profile = null;
      }

      return { ...session, profile, pdsUrl };
    },
    onSuccess: async ({ profile, pdsUrl, ...session }) => {
      // Store tokens securely - await to prevent race conditions
      await setAuthMutation.mutateAsync({
        token: session.accessJwt,
        refreshToken: session.refreshJwt,
        did: session.did,
        handle: session.handle,
        pdsUrl,
        displayName: profile?.displayName ?? session.handle,
        avatar: profile?.avatar ?? null,
      });

      // Invalidate all auth-related queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['auth'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}
