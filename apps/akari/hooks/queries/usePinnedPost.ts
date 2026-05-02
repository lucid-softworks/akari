import { useQuery } from '@tanstack/react-query';

import { BlueskyApi } from '@/bluesky-api';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';

/**
 * Resolves a pinned-post URI to its full post view. Used by PostsTab to
 * render the post above the regular feed.
 */
export function usePinnedPost(uri: string | undefined) {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useQuery({
    queryKey: ['pinnedPost', currentAccount?.pdsUrl, uri] as const,
    enabled: !!token && !!currentAccount?.pdsUrl && !!uri,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');
      if (!uri) throw new Error('No URI provided');

      const api = new BlueskyApi(currentAccount.pdsUrl);
      return api.getPost(token, uri);
    },
  });
}
