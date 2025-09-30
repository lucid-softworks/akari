import { useSetAuthentication } from '@/hooks/mutations/useSetAuthentication';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { BlueskyApi } from '@/bluesky-api';
import { useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * Mutation hook for refreshing the Bluesky session
 * Used to renew expired access tokens
 */
export function useRefreshSession() {
  const queryClient = useQueryClient();
  const setAuthMutation = useSetAuthentication();
  const { data: currentAccount } = useCurrentAccount();

  return useMutation({
    mutationFn: async () => {
      if (!currentAccount?.pdsUrl || !currentAccount.jwtToken || !currentAccount.refreshToken) {
        throw new Error('Missing session details for this account');
      }
      const api = new BlueskyApi(currentAccount.pdsUrl);
      api.setSession(
        currentAccount.active === false
          ? {
              handle: currentAccount.handle,
              did: currentAccount.did,
              accessJwt: currentAccount.jwtToken,
              refreshJwt: currentAccount.refreshToken,
              active: false,
              status: currentAccount.status ?? 'deactivated',
              email: currentAccount.email,
              emailConfirmed: currentAccount.emailConfirmed,
              emailAuthFactor: currentAccount.emailAuthFactor,
            }
          : {
              handle: currentAccount.handle,
              did: currentAccount.did,
              accessJwt: currentAccount.jwtToken,
              refreshJwt: currentAccount.refreshToken,
              active: true,
              email: currentAccount.email,
              emailConfirmed: currentAccount.emailConfirmed,
              emailAuthFactor: currentAccount.emailAuthFactor,
            },
      );
      return await api.refreshSession();
    },
    onSuccess: async (session) => {
      // Update stored tokens
      await setAuthMutation.mutateAsync({
        token: session.accessJwt,
        refreshToken: session.refreshJwt,
        did: session.did,
        handle: session.handle,
        pdsUrl: currentAccount?.pdsUrl,
        active: session.active,
        status: session.active ? undefined : session.status,
        email: session.email,
        emailConfirmed: session.emailConfirmed,
        emailAuthFactor: session.emailAuthFactor,
      });

      // Invalidate auth queries with the new user-specific key
      queryClient.invalidateQueries({ queryKey: ['auth', session.did] });
    },
  });
}
