import { useQuery } from '@tanstack/react-query';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { queryKeys } from '@/hooks/queryKeys';
import { apiForAccount } from '@/utils/blueskyApi';

/**
 * Resolves a pinned-post URI to its full post view. Used by PostsTab to
 * render the post above the regular feed.
 */
export function usePinnedPost(uri: string | undefined) {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useQuery({
    queryKey: queryKeys.pinnedPost.detail(currentAccount?.pdsUrl, uri),
    enabled: !!token && !!currentAccount?.pdsUrl && !!uri,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');
      if (!uri) throw new Error('No URI provided');

      const api = apiForAccount(currentAccount);
      return api.getPost(token, uri);
    },
  });
}
