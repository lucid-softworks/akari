import { useQuery } from "@tanstack/react-query";

import { useJwtToken } from "@/hooks/queries/useJwtToken";
import { useCurrentAccount } from "@/hooks/queries/useCurrentAccount";
import { BlueskyApi } from "@/bluesky-api";
import { useAuthenticatedBluesky } from "@/hooks/useAuthenticatedBluesky";

export function usePost(postUri: string | null) {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();
  const apiOptions = useAuthenticatedBluesky();

  return useQuery({
    queryKey: ["post", postUri, currentAccount?.pdsUrl],
    queryFn: async () => {
      if (!token || !postUri) throw new Error("No access token or post URI");
      if (!currentAccount?.pdsUrl) throw new Error("No PDS URL available");

      const api = new BlueskyApi(currentAccount.pdsUrl, apiOptions);
      return await api.getPost(token, postUri);
    },
    enabled: !!postUri,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch a parent post when viewing a reply
 */
export function useParentPost(parentUri: string | null) {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();
  const apiOptions = useAuthenticatedBluesky();

  const {
    data: parentPost,
    error,
    isLoading,
  } = useQuery({
    queryKey: ["parentPost", parentUri, currentAccount?.pdsUrl],
    queryFn: async () => {
      if (!parentUri) return null;
      if (!token) throw new Error("No access token");
      if (!currentAccount?.pdsUrl) throw new Error("No PDS URL available");
      const api = new BlueskyApi(currentAccount.pdsUrl, apiOptions);
      const result = await api.getPost(token, parentUri);
      return result;
    },
    enabled: !!parentUri,
  });

  return { parentPost, error, isLoading };
}

/**
 * Hook to fetch a root post when viewing a reply in a thread
 */
export function useRootPost(rootUri: string | null) {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();
  const apiOptions = useAuthenticatedBluesky();

  const {
    data: rootPost,
    error,
    isLoading,
  } = useQuery({
    queryKey: ["rootPost", rootUri, currentAccount?.pdsUrl],
    queryFn: async () => {
      if (!rootUri) return null;
      if (!token) throw new Error("No access token");
      if (!currentAccount?.pdsUrl) throw new Error("No PDS URL available");
      const api = new BlueskyApi(currentAccount.pdsUrl, apiOptions);
      const result = await api.getPost(token, rootUri);
      return result;
    },
    enabled: !!rootUri,
  });

  return { rootPost, error, isLoading };
}
