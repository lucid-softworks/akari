import { useSetAuthentication } from '@/hooks/mutations/useSetAuthentication';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiForAccount } from '@/utils/blueskyApi';

/**
 * Mutation hook for refreshing the Bluesky session
 * Used to renew expired access tokens
 */
type RefreshSessionParams = {
  /** The refresh JWT token */
  refreshToken: string;
};

export function useRefreshSession() {
  const queryClient = useQueryClient();
  const setAuthMutation = useSetAuthentication();
  const { data: currentAccount } = useCurrentAccount();

  return useMutation({
    mutationFn: async ({ refreshToken }: RefreshSessionParams) => {
      if (!currentAccount?.pdsUrl) {
        throw new Error('No PDS URL available for this account');
      }
      const api = apiForAccount(currentAccount);
      return await api.refreshSession(refreshToken);
    },
    onSuccess: (session) => {
      // Update stored tokens
      setAuthMutation.mutate({
        token: session.accessJwt,
        refreshToken: session.refreshJwt,
        did: session.did,
        handle: session.handle,
      });

      // Invalidate auth queries with the new user-specific key
      queryClient.invalidateQueries({ queryKey: ['auth', session.did] });
    },
  });
}
