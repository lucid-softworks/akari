import { useSetAuthentication } from '@/hooks/mutations/useSetAuthentication';
import { queryKeys } from '@/hooks/queryKeys';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { BlueskyProfileResponse, BlueskySession } from '@/bluesky-api';
import { apiForPdsUrl } from '@/utils/blueskyApi';

/**
 * Mutation hook for creating a new atproto account on a chosen PDS.
 * Mirrors `useSignIn`: calls `com.atproto.server.createAccount`, fetches
 * the freshly-created profile (best-effort), then stashes the tokens
 * through the same authentication pipeline so the new account becomes
 * the active session immediately.
 */
type CreateAccountVariables = {
  email: string;
  handle: string;
  password: string;
  inviteCode?: string;
  pdsUrl: string;
};

type CreateAccountResult = BlueskySession & {
  profile: BlueskyProfileResponse | null;
  pdsUrl: string;
};

export function useCreateAccount() {
  const queryClient = useQueryClient();
  const setAuthMutation = useSetAuthentication();

  return useMutation({
    mutationFn: async ({
      email,
      handle,
      password,
      inviteCode,
      pdsUrl,
    }: CreateAccountVariables): Promise<CreateAccountResult> => {
      const api = apiForPdsUrl(pdsUrl);
      const session = await api.createAccount({ email, handle, password, inviteCode });

      let profile: BlueskyProfileResponse | null = null;

      try {
        profile = await api.getProfile(session.accessJwt, session.did);
      } catch {
        profile = null;
      }

      return { ...session, profile, pdsUrl };
    },
    onSuccess: async ({ profile, pdsUrl, ...session }) => {
      await setAuthMutation.mutateAsync({
        token: session.accessJwt,
        refreshToken: session.refreshJwt,
        did: session.did,
        handle: session.handle,
        pdsUrl,
        displayName: profile?.displayName ?? session.handle,
        avatar: profile?.avatar ?? null,
      });

      queryClient.invalidateQueries({ queryKey: queryKeys.auth.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.all });
    },
  });
}
