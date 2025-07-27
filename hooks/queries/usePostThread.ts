import { useQuery } from "@tanstack/react-query";

import { blueskyApi } from "@/utils/blueskyApi";
import { jwtStorage } from "@/utils/secureStorage";

export function usePostThread(postUri: string | null) {
  return useQuery({
    queryKey: ["postThread", postUri],
    queryFn: async () => {
      const token = jwtStorage.getToken();
      if (!token || !postUri) throw new Error("No access token or post URI");

      return await blueskyApi.getPostThread(token, postUri);
    },
    enabled: !!postUri,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
