import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { apiForAccount } from '@/utils/blueskyApi';

type BookmarkPostInput = {
  postUri: string;
  postCid: string;
  action: 'bookmark' | 'unbookmark';
};

/**
 * Mutation hook for bookmarking and unbookmarking posts
 */
export function useBookmarkPost() {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postUri, postCid, action }: BookmarkPostInput) => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');

      const api = apiForAccount(currentAccount);

      if (action === 'bookmark') {
        await api.addBookmark(token, postUri, postCid);
      } else {
        await api.removeBookmark(token, postUri, postCid);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
    },
  });
}
