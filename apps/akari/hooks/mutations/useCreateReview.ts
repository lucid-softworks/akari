import { useMutation, useQueryClient } from '@tanstack/react-query';

import { type CreateReviewInput } from '@/bluesky-api';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { queryKeys } from '@/hooks/queryKeys';
import { apiForAccount } from '@/utils/blueskyApi';

export function useCreateReview() {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['createReview'],
    mutationFn: async (review: CreateReviewInput) => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL');
      if (!currentAccount?.did) throw new Error('No DID');

      const api = apiForAccount(currentAccount);
      return api.createReview(token, currentAccount.did, review);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.author.posts.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.timeline.all });
    },
  });
}
