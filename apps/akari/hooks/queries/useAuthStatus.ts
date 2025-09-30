import { useQuery } from '@tanstack/react-query';

import { BlueskyApi, type BlueskySession } from '@/bluesky-api';
import { useClearAuthentication } from '@/hooks/mutations/useClearAuthentication';
import { useSetAuthentication } from '@/hooks/mutations/useSetAuthentication';
import { useCurrentAccount } from './useCurrentAccount';
import { useJwtToken } from './useJwtToken';
import { useRefreshToken } from './useRefreshToken';

/**
 * Query hook for checking authentication status
 * Validates stored tokens and returns current auth state
 */
export function useAuthStatus() {
  const { data: token } = useJwtToken();
  const { data: refreshToken } = useRefreshToken();
  const { data: currentAccount } = useCurrentAccount();
  const setAuthMutation = useSetAuthentication();
  const clearAuthMutation = useClearAuthentication();

  const currentUserDid = currentAccount?.did || null;

  return useQuery({
    queryKey: ['auth', currentUserDid],
    queryFn: async () => {
      if (!token || !refreshToken) {
        return { isAuthenticated: false };
      }

      try {
        // Try to refresh the session to validate tokens
        if (!currentAccount?.pdsUrl) {
          throw new Error('No PDS URL available for this account');
        }
        const api = new BlueskyApi(currentAccount.pdsUrl);
        const session: BlueskySession = currentAccount?.active === false
          ? {
              handle: currentAccount.handle,
              did: currentAccount.did,
              accessJwt: token,
              refreshJwt: refreshToken,
              active: false,
              status: currentAccount.status ?? 'deactivated',
              email: currentAccount.email,
              emailConfirmed: currentAccount.emailConfirmed,
              emailAuthFactor: currentAccount.emailAuthFactor,
            }
          : {
              handle: currentAccount.handle,
              did: currentAccount.did,
              accessJwt: token,
              refreshJwt: refreshToken,
              active: true,
              email: currentAccount.email,
              emailConfirmed: currentAccount.emailConfirmed,
              emailAuthFactor: currentAccount.emailAuthFactor,
            };

        api.setSession(session);

        const refreshedSession = await api.refreshSession();

        // Update stored tokens with fresh ones
        await setAuthMutation.mutateAsync({
          token: refreshedSession.accessJwt,
          refreshToken: refreshedSession.refreshJwt,
          did: refreshedSession.did,
          handle: refreshedSession.handle,
          pdsUrl: currentAccount.pdsUrl,
          active: refreshedSession.active,
          status: refreshedSession.active ? undefined : refreshedSession.status,
          email: refreshedSession.email,
          emailConfirmed: refreshedSession.emailConfirmed,
          emailAuthFactor: refreshedSession.emailAuthFactor,
        });

        return {
          isAuthenticated: true,
          user: {
            did: refreshedSession.did,
            handle: refreshedSession.handle,
            email: refreshedSession.email,
            active: refreshedSession.active,
            status: refreshedSession.active === false ? refreshedSession.status : undefined,
          },
        };
      } catch {
        // Clear invalid tokens
        await clearAuthMutation.mutateAsync();
        return { isAuthenticated: false };
      }
    },
    staleTime: 0, // Always check auth status
    retry: false,
  });
}
