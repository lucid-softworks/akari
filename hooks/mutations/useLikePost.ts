import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { blueskyApi } from '@/utils/blueskyApi';

/**
 * Mutation hook for liking and unliking posts
 */
export function useLikePost() {
  const queryClient = useQueryClient();
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useMutation({
    mutationFn: async ({
      postUri,
      postCid,
      likeUri,
      action,
    }: {
      /** The post's URI */
      postUri: string;
      /** The post's CID (required for like) */
      postCid?: string;
      /** The like record's URI (required for unlike) */
      likeUri?: string;
      /** Whether to like or unlike */
      action: 'like' | 'unlike';
    }) => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.did) throw new Error('No user DID available');

      if (action === 'like') {
        if (!postCid) throw new Error('Post CID is required for like');
        return await blueskyApi.likePost(token, postUri, postCid, currentAccount.did);
      } else {
        if (!likeUri) throw new Error('Like URI is required for unlike');
        return await blueskyApi.unlikePost(token, likeUri, currentAccount.did);
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate feed queries to refresh like counts and status
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['authorFeed'] });
      queryClient.invalidateQueries({ queryKey: ['authorLikes'] });

      // Invalidate specific post queries
      queryClient.invalidateQueries({ queryKey: ['post', variables.postUri] });
      queryClient.invalidateQueries({ queryKey: ['postThread', variables.postUri] });
    },
  });
}
