import { useQuery } from "@tanstack/react-query";

import { useJwtToken } from "@/hooks/queries/useJwtToken";
import { useCurrentAccount } from "@/hooks/queries/useCurrentAccount";
import { queryKeys } from '@/hooks/queryKeys';
import { apiForAccount } from '@/utils/blueskyApi';
export function usePostThread(postUri: string | null) {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useQuery({
    queryKey: queryKeys.postThread.detail(postUri, currentAccount?.pdsUrl),
    queryFn: async () => {
      if (!token || !postUri) throw new Error("No access token or post URI");
      if (!currentAccount?.pdsUrl) throw new Error("No PDS URL available");

      const api = apiForAccount(currentAccount);
      return await api.getPostThread(token, postUri);
    },
    enabled: !!postUri && !!token,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
