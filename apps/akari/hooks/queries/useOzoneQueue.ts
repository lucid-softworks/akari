import { useInfiniteQuery } from '@tanstack/react-query';
import type {
  OzoneQueryStatusesOptions,
  OzoneQueryStatusesResponse,
  OzoneSubjectStatus,
} from 'bluesky-ozone';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useOzoneDid } from '@/hooks/useOzoneSettings';
import { queryKeys } from '@/hooks/queryKeys';
import { apiForAccount } from '@/utils/blueskyApi';
import { ozoneForAccount } from '@/utils/blueskyOzone';
import { fetchAvatarsByDid, subjectDid } from '@/utils/ozoneAvatars';

export type OzoneQueueFilters = Omit<OzoneQueryStatusesOptions, 'cursor' | 'limit'>;

/**
 * Paginated queue of subject statuses (`tools.ozone.moderation.queryStatuses`).
 *
 * Filters map 1:1 to the lexicon fields. Avatars are enriched after the
 * page lands by batching the unique subject DIDs through
 * `app.bsky.actor.getProfiles` — Ozone returns handles but not avatars,
 * and the row renderer reads `accountStats.avatar` opportunistically.
 */
export function useOzoneQueue(filters: OzoneQueueFilters = {}, limit = 25) {
  const { data: currentAccount } = useCurrentAccount();
  const { data: token } = useJwtToken();
  const ozoneDid = useOzoneDid();

  return useInfiniteQuery<
    OzoneQueryStatusesResponse,
    Error,
    { pages: OzoneQueryStatusesResponse[]; pageParams: (string | undefined)[] },
    ReturnType<typeof queryKeys.ozone.queue>,
    string | undefined
  >({
    queryKey: queryKeys.ozone.queue(ozoneDid, { ...filters, limit }),
    enabled: !!token && !!currentAccount?.pdsUrl && !!ozoneDid,
    staleTime: 30 * 1000,
    initialPageParam: undefined,
    getNextPageParam: (last) => last.cursor,
    queryFn: async ({ pageParam }) => {
      if (!token || !currentAccount?.pdsUrl) {
        return { subjectStatuses: [], cursor: undefined };
      }
      const ozone = ozoneForAccount(currentAccount);
      const response = await ozone.queryStatuses(token, ozoneDid, {
        ...filters,
        limit,
        cursor: pageParam,
      });
      // Enrich rows with avatars (best effort). The renderer reads
      // `accountStats.avatar`, so we splice avatars onto a copy of each
      // row without disturbing the existing shape.
      try {
        const api = apiForAccount(currentAccount);
        const dids = response.subjectStatuses
          .map((s) => subjectDid(s.subject))
          .filter((d): d is string => !!d);
        const avatars = await fetchAvatarsByDid(api, token, dids);
        const enriched: OzoneSubjectStatus[] = response.subjectStatuses.map((s) => {
          const did = subjectDid(s.subject);
          const avatar = did ? avatars.get(did) : undefined;
          if (!avatar) return s;
          return {
            ...s,
            accountStats: { ...(s.accountStats ?? {}), avatar },
          };
        });
        return { subjectStatuses: enriched, cursor: response.cursor };
      } catch {
        return response;
      }
    },
  });
}
