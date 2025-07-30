import { useQuery } from "@tanstack/react-query";

import { useJwtToken } from "@/hooks/queries/useJwtToken";
import { blueskyApi } from "@/utils/blueskyApi";

export function usePost(postUri: string | null) {
  const { data: token } = useJwtToken();

  return useQuery({
    queryKey: ["post", postUri],
    queryFn: async () => {
      if (!token || !postUri) throw new Error("No access token or post URI");

      return await blueskyApi.getPost(token, postUri);
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

  const {
    data: parentPost,
    error,
    isLoading,
  } = useQuery({
    queryKey: ["parentPost", parentUri],
    queryFn: async () => {
      if (!parentUri) return null;
      if (!token) throw new Error("No access token");
      const result = await blueskyApi.getPost(token, parentUri);
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

  const {
    data: rootPost,
    error,
    isLoading,
  } = useQuery({
    queryKey: ["rootPost", rootUri],
    queryFn: async () => {
      if (!rootUri) return null;
      if (!token) throw new Error("No access token");
      const result = await blueskyApi.getPost(token, rootUri);
      return result;
    },
    enabled: !!rootUri,
  });

  return { rootPost, error, isLoading };
}
