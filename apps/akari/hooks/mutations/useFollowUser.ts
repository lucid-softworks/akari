import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { BlueskyApi } from '@/bluesky-api';
import { useAuthenticatedBluesky } from '@/hooks/useAuthenticatedBluesky';

/**
 * Mutation hook for following and unfollowing users
 */
export function useFollowUser() {
  const queryClient = useQueryClient();
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();
  const apiOptions = useAuthenticatedBluesky();

  return useMutation({
    mutationKey: ['followUser'],
    mutationFn: async ({
      did,
      followUri,
      action,
    }: {
      /** The user's DID */
      did: string;
      /** The follow URI (required for unfollow) */
      followUri?: string;
      /** Whether to follow or unfollow */
      action: 'follow' | 'unfollow';
    }) => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');

      const api = new BlueskyApi(currentAccount.pdsUrl, apiOptions);

      if (action === 'follow') {
        return await api.followUser(token, did);
      } else {
        if (!followUri) throw new Error('Follow URI is required for unfollow');
        return await api.unfollowUser(token, followUri);
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate profile queries to refresh follow status
      queryClient.invalidateQueries({ queryKey: ['profile', variables.did] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}
