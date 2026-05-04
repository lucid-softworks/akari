import { BlueskyApi } from '@/bluesky-api';
import { useClearAuthentication } from '@/hooks/mutations/useClearAuthentication';
import { useSetAuthentication } from '@/hooks/mutations/useSetAuthentication';
import type { Account } from '@/types/account';
import { refreshOAuthSession } from '@/utils/oauth/refresh';
import { storage } from '@/utils/secureStorage';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCurrentAccount } from './useCurrentAccount';
import { useJwtToken } from './useJwtToken';
import { useRefreshToken } from './useRefreshToken';

/** Refresh the OAuth access token whenever it's within this window of expiry. */
const OAUTH_REFRESH_LEEWAY_SECONDS = 5 * 60;

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
  const queryClient = useQueryClient();

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

      // OAuth accounts refresh against the auth server's token endpoint with
      // DPoP — a different shape from the password flow's
      // `com.atproto.server.refreshSession`. We refresh proactively when the
      // access token is within `OAUTH_REFRESH_LEEWAY_SECONDS` of expiry, then
      // mirror the new token + rotated refresh token across react-query and
      // secureStorage so every subsequent reader picks them up.
      if (currentAccount.oauth) {
        const now = Math.floor(Date.now() / 1000);
        const expiresInSeconds = currentAccount.oauth.expiresAt - now;

        if (expiresInSeconds > OAUTH_REFRESH_LEEWAY_SECONDS) {
          return {
            isAuthenticated: true,
            user: { did: currentAccount.did, handle: currentAccount.handle },
          };
        }

        try {
          const refreshed = await refreshOAuthSession(currentAccount);

          queryClient.setQueryData(['jwtToken'], refreshed.jwtToken);
          queryClient.setQueryData(['refreshToken'], refreshed.refreshToken);
          queryClient.setQueryData(['currentAccount'], refreshed);

          const accountsList =
            queryClient.getQueryData<Account[]>(['accounts']) ??
            storage.getItem('accounts') ??
            [];
          const updatedAccounts = accountsList.map((a) =>
            a.did === refreshed.did ? refreshed : a,
          );
          queryClient.setQueryData(['accounts'], updatedAccounts);

          storage.setItem('jwtToken', refreshed.jwtToken);
          storage.setItem('refreshToken', refreshed.refreshToken);
          storage.setItem('currentAccount', refreshed);
          storage.setItem('accounts', updatedAccounts);

          return {
            isAuthenticated: true,
            user: { did: refreshed.did, handle: refreshed.handle },
          };
        } catch (refreshError) {
          if (__DEV__) {
            console.warn('OAuth refresh failed:', refreshError);
          }
          clearAuthMutation.mutate();
          return { isAuthenticated: false };
        }
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
