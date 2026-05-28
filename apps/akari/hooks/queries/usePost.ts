import { useQuery } from '@tanstack/react-query';

import { getPostView, resolveIdentifierToDid } from '@/hooks/queries/microcosm';
import { useAcceptLabelerDids } from '@/hooks/queries/useAcceptLabelerDids';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { queryKeys } from '@/hooks/queryKeys';
import { useAppViewEnabled } from '@/hooks/useAppViewEnabled';
import { apiForAccount, apiForPublicAppView } from '@/utils/blueskyApi';

export function usePost({ actor, rKey }: { actor?: string; rKey?: string }) {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();
  const appViewEnabled = useAppViewEnabled();
  const acceptLabelers = useAcceptLabelerDids();

  return useQuery({
    queryKey: queryKeys.post.detail({ actor, rKey, pdsUrl: currentAccount?.pdsUrl, appViewEnabled }),
    queryFn: async () => {
      if (!actor || !rKey) throw new Error('No actor or rKey provided');
      // Post-detail navigation builds the URI from the author's handle, but
      // the microcosm path (slingshot + constellation) only indexes by DID.
      // Resolve to a DID so the at:// authority is canonical — DIDs pass
      // through unchanged and the AppView accepts either form.
      const repoDid = await resolveIdentifierToDid(actor);
      const constructedUri = `at://${repoDid}/app.bsky.feed.post/${rKey}`;

      if (!appViewEnabled) {
        return getPostView(constructedUri);
      }

      // Guest / logged-out path: hit the public AppView with no token,
      // mirroring useFeed. The client treats accessJwt === '' as public
      // read. Without this the query would simply be disabled and the
      // screen would render "Post not found" despite the post existing.
      if (!token || !currentAccount?.pdsUrl) {
        const api = apiForPublicAppView();
        return await api.getPost('', constructedUri, acceptLabelers);
      }

      const api = apiForAccount(currentAccount);
      return await api.getPost(token, constructedUri, acceptLabelers);
    },
    enabled: !!actor && !!rKey,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch a parent post when viewing a reply
 */
export function useParentPost(parentUri: string | null) {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();
  const appViewEnabled = useAppViewEnabled();
  const acceptLabelers = useAcceptLabelerDids();

  return useQuery({
    queryKey: queryKeys.parentPost(parentUri, currentAccount?.pdsUrl, appViewEnabled),
    queryFn: async () => {
      if (!parentUri) return null;

      if (!appViewEnabled) {
        return getPostView(parentUri);
      }

      if (!token || !currentAccount?.pdsUrl) {
        const api = apiForPublicAppView();
        return await api.getPost('', parentUri, acceptLabelers);
      }
      const api = apiForAccount(currentAccount);
      const result = await api.getPost(token, parentUri, acceptLabelers);
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
  const appViewEnabled = useAppViewEnabled();
  const acceptLabelers = useAcceptLabelerDids();

  return useQuery({
    queryKey: queryKeys.rootPost(rootUri, currentAccount?.pdsUrl, appViewEnabled),
    queryFn: async () => {
      if (!rootUri) return null;

      if (!appViewEnabled) {
        return getPostView(rootUri);
      }

      if (!token || !currentAccount?.pdsUrl) {
        const api = apiForPublicAppView();
        return await api.getPost('', rootUri, acceptLabelers);
      }
      const api = apiForAccount(currentAccount);
      const result = await api.getPost(token, rootUri, acceptLabelers);
      return result;
    },
    enabled: !!rootUri,
  });
}
