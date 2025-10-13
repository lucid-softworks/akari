import { useQuery } from '@tanstack/react-query';

import { BlueskyApi } from '@/bluesky-api';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';

export function usePost({ actor, rKey }: { actor?: string; rKey?: string }) {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useQuery({
    queryKey: ['post', { actor, rKey }, currentAccount?.pdsUrl],
    queryFn: async () => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');

      if (!actor || !rKey) throw new Error('No actor or rKey provided');

      const constructedUri = `at://${actor}/app.bsky.feed.post/${rKey}`;
      const api = new BlueskyApi(currentAccount.pdsUrl);
      return await api.getPost(token, constructedUri);
    },
    enabled: !!(token && currentAccount?.pdsUrl && actor && rKey),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch a parent post when viewing a reply
 */
export function useParentPost(parentUri: string | null) {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useQuery({
    queryKey: ['parentPost', parentUri, currentAccount?.pdsUrl],
    queryFn: async () => {
      if (!parentUri) return null;
      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');
      const api = new BlueskyApi(currentAccount.pdsUrl);
      const result = await api.getPost(token, parentUri);
      return result;
    },
    enabled: !!parentUri,
  });
}

/**
 * Hook to fetch a root post when viewing a reply in a thread
 */
export function useRootPost(rootUri: string | null) {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useQuery({
    queryKey: ['rootPost', rootUri, currentAccount?.pdsUrl],
    queryFn: async () => {
      if (!rootUri) return null;
      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');
      const api = new BlueskyApi(currentAccount.pdsUrl);
      const result = await api.getPost(token, rootUri);
      return result;
    },
    enabled: !!rootUri,
  });
}
