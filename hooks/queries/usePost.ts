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
