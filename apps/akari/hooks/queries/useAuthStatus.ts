import { BlueskyApi } from '@/bluesky-api';
import { useClearAuthentication } from '@/hooks/mutations/useClearAuthentication';
import { useSetAuthentication } from '@/hooks/mutations/useSetAuthentication';
import { useQuery } from '@tanstack/react-query';
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

      if (!currentAccount?.pdsUrl) {
        return { isAuthenticated: false };
      }

      // OAuth accounts use the auth server's token endpoint with DPoP for
      // refresh — `BlueskyApi.refreshSession` only knows the password-flow
      // shape and would 401 on every check. Trust the tokens we have until
      // expiry-driven refresh wires them up; a real failure surfaces on the
      // first authenticated XRPC call instead.
      if (currentAccount.oauth) {
        return {
          isAuthenticated: true,
          user: {
            did: currentAccount.did,
            handle: currentAccount.handle,
          },
        };
      }

      try {
        const api = new BlueskyApi(currentAccount.pdsUrl);
        const session = await api.refreshSession(refreshToken);

        setAuthMutation.mutate({
          token: session.accessJwt,
          refreshToken: session.refreshJwt,
          did: session.did,
          handle: session.handle,
          pdsUrl: currentAccount.pdsUrl,
        });

        return {
          isAuthenticated: true,
          user: {
            did: session.did,
            handle: session.handle,
            email: session.email,
            active: session.active,
            status: session.active === false ? session.status : undefined,
          },
        };
      } catch (error) {
        // Only clear tokens on a genuine auth failure. Network blips, request
        // aborts (e.g. during HMR), and PDS errors must not log the user out.
        const e = error as { status?: number; errorCode?: string };
        const isAuthFailure =
          e.status === 401 ||
          e.status === 403 ||
          e.errorCode === 'ExpiredToken' ||
          e.errorCode === 'InvalidToken' ||
          e.errorCode === 'AuthenticationRequired' ||
          e.errorCode === 'AccountTakedown';

        if (isAuthFailure) {
          clearAuthMutation.mutate();
          return { isAuthenticated: false };
        }

        throw error;
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - don't check too frequently
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });
}
