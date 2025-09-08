import { useClearAuthentication } from '@/hooks/mutations/useClearAuthentication';
import { useSetAuthentication } from '@/hooks/mutations/useSetAuthentication';
import { BlueskyApi } from '@/bluesky-api';
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

      try {
        // Try to refresh the session to validate tokens
        if (!currentAccount?.pdsUrl) {
          throw new Error('No PDS URL available for this account');
        }
        const api = new BlueskyApi(currentAccount.pdsUrl);
        const session = await api.refreshSession(refreshToken);

        // Update stored tokens with fresh ones
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
      } catch {
        // Clear invalid tokens
        clearAuthMutation.mutate();
        return { isAuthenticated: false };
      }
    },
    staleTime: 0, // Always check auth status
    retry: false,
  });
}
