import { useQuery } from "@tanstack/react-query";

import { blueskyApi } from "@/utils/blueskyApi";
import { jwtStorage } from "@/utils/secureStorage";

export function usePost(postUri: string | null) {
  return useQuery({
    queryKey: ["post", postUri],
    queryFn: async () => {
      const token = jwtStorage.getToken();
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
  console.log("useParentPost called with URI:", parentUri);

  return useQuery({
    queryKey: ["parentPost", parentUri],
    queryFn: async () => {
      const token = jwtStorage.getToken();
      if (!token || !parentUri)
        throw new Error("No access token or parent URI");

      console.log("Fetching parent post:", parentUri);
      const result = await blueskyApi.getPost(token, parentUri);
      console.log("Parent post result:", result);
      return result;
    },
    enabled: !!parentUri,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch a root post when viewing a reply in a thread
 */
export function useRootPost(rootUri: string | null) {
  console.log("useRootPost called with URI:", rootUri);

  return useQuery({
    queryKey: ["rootPost", rootUri],
    queryFn: async () => {
      const token = jwtStorage.getToken();
      if (!token || !rootUri) throw new Error("No access token or root URI");

      console.log("Fetching root post:", rootUri);
      const result = await blueskyApi.getPost(token, rootUri);
      console.log("Root post result:", result);
      return result;
    },
    enabled: !!rootUri,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
