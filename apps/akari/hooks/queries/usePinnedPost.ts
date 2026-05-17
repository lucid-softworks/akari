import { useQuery } from '@tanstack/react-query';

import { getPostView } from '@/hooks/queries/microcosm';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { queryKeys } from '@/hooks/queryKeys';
import { useAppViewEnabled } from '@/hooks/useAppViewEnabled';
import { apiForAccount } from '@/utils/blueskyApi';

/**
 * Resolves a pinned-post URI to its full post view. Used by PostsTab to
 * render the post above the regular feed.
 */
export function usePinnedPost(uri: string | undefined) {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();
  const appViewEnabled = useAppViewEnabled();

  return useQuery({
    queryKey: queryKeys.pinnedPost.detail(currentAccount?.pdsUrl, uri, appViewEnabled),
    enabled: !!uri && (appViewEnabled ? !!token && !!currentAccount?.pdsUrl : true),
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!uri) throw new Error('No URI provided');

      if (!appViewEnabled) {
        return getPostView(uri);
      }

      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');

      const api = apiForAccount(currentAccount);
      return api.getPost(token, uri);
    },
  });
}
