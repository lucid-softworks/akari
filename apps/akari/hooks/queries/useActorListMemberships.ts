import { useQuery } from '@tanstack/react-query';

import { BlueskyApi } from '@/bluesky-api';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';

export type ActorListMemberships = {
  listUris: string[];
  recordUrisByListUri: Record<string, string>;
};

export function useActorListMemberships(actorDid: string | undefined) {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useQuery<ActorListMemberships>({
    queryKey: ['listMemberships', actorDid, currentAccount?.did, currentAccount?.pdsUrl],
    queryFn: async () => {
      if (!token) throw new Error('No access token');
      if (!actorDid) throw new Error('No actor DID provided');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');
      if (!currentAccount?.did) throw new Error('No DID available');

      const api = new BlueskyApi(currentAccount.pdsUrl);
      const membershipMap: Record<string, string> = {};

      let cursor: string | undefined;
      do {
        const response = await api.listListItems(token, currentAccount.did, 100, cursor);
        for (const record of response.records ?? []) {
          if (record.value.subject === actorDid) {
            membershipMap[record.value.list] = record.uri;
          }
        }
        cursor = response.cursor;
      } while (cursor);

      return {
        listUris: Object.keys(membershipMap),
        recordUrisByListUri: membershipMap,
      };
    },
    enabled: Boolean(actorDid && token && currentAccount?.did && currentAccount?.pdsUrl),
  });
}
