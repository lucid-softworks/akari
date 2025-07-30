import { useQuery } from "@tanstack/react-query";

import { useJwtToken } from "@/hooks/queries/useJwtToken";
import { blueskyApi } from "@/utils/blueskyApi";

export function usePostThread(postUri: string | null) {
  const { data: token } = useJwtToken();

  return useQuery({
    queryKey: ["postThread", postUri],
    queryFn: async () => {
      if (!token || !postUri) throw new Error("No access token or post URI");

      return await blueskyApi.getPostThread(token, postUri);
    },
    enabled: !!postUri && !!token,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
