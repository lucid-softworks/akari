import { useQuery } from "@tanstack/react-query";

import { useJwtToken } from "@/hooks/queries/useJwtToken";
import { useCurrentAccount } from "@/hooks/queries/useCurrentAccount";
import { BlueskyApi } from "@/bluesky-api";

export function usePostThread(postUri: string | null) {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useQuery({
    queryKey: ["postThread", postUri, currentAccount?.pdsUrl],
    queryFn: async () => {
      if (!token || !postUri) throw new Error("No access token or post URI");
      if (!currentAccount?.pdsUrl) throw new Error("No PDS URL available");

      const api = new BlueskyApi(currentAccount.pdsUrl);
      return await api.getPostThread(token, postUri);
    },
    enabled: !!postUri && !!token,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
