import { useQuery } from "@tanstack/react-query";

import { getProfileView } from "@/hooks/queries/microcosm";
import { useAcceptLabelerDids } from "@/hooks/queries/useAcceptLabelerDids";
import { useJwtToken } from "@/hooks/queries/useJwtToken";
import { queryKeys } from '@/hooks/queryKeys';
import { useAppViewEnabled } from "@/hooks/useAppViewEnabled";
import { useCurrentAccount } from "./useCurrentAccount";
import { apiForAccount } from '@/utils/blueskyApi';

/**
 * Query hook for fetching a user's profile information
 * @param identifier - The user's handle or DID
 */
export function useProfile(identifier: string | undefined) {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();
  const appViewEnabled = useAppViewEnabled();
  const acceptLabelers = useAcceptLabelerDids();

  return useQuery({
    queryKey: queryKeys.profile.detail(identifier, currentAccount?.pdsUrl, appViewEnabled),
    queryFn: async () => {
      if (!identifier) throw new Error("No identifier provided");

      if (!appViewEnabled) {
        return getProfileView(identifier);
      }

      if (!token) throw new Error("No access token");
      if (!currentAccount?.pdsUrl) throw new Error("No PDS URL available");

      const api = apiForAccount(currentAccount);
      const profile = await api.getProfile(token, identifier, acceptLabelers);

      return profile;
    },
    enabled: !!identifier && (appViewEnabled ? !!token : true),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
