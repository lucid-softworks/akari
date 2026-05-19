import { useInfiniteQuery } from '@tanstack/react-query';
import type {
  OzoneModEvent,
  OzoneQueryEventsOptions,
  OzoneQueryEventsResponse,
} from 'bluesky-ozone';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useOzoneDid } from '@/hooks/useOzoneSettings';
import { queryKeys } from '@/hooks/queryKeys';
import { apiForAccount } from '@/utils/blueskyApi';
import { ozoneForAccount } from '@/utils/blueskyOzone';
import { fetchAvatarsByDid, subjectDid } from '@/utils/ozoneAvatars';

export type OzoneEventsFilters = Omit<OzoneQueryEventsOptions, 'cursor' | 'limit'>;

/**
 * Paginated audit log of moderation events (`tools.ozone.moderation.queryEvents`).
 *
 * Rows are enriched with `creatorAvatar`/`subjectAvatar` via `getProfiles`
 * for the same reason the queue is — Ozone returns DIDs/handles but not
 * avatars, and the renderer reads those shim fields when present.
 */
export function useOzoneEvents(filters: OzoneEventsFilters = {}, limit = 50) {
  const { data: currentAccount } = useCurrentAccount();
  const { data: token } = useJwtToken();
  const ozoneDid = useOzoneDid();

  return useInfiniteQuery<
    OzoneQueryEventsResponse,
    Error,
    { pages: OzoneQueryEventsResponse[]; pageParams: (string | undefined)[] },
    ReturnType<typeof queryKeys.ozone.events>,
    string | undefined
  >({
    queryKey: queryKeys.ozone.events(ozoneDid, { ...filters, limit }),
    enabled: !!token && !!currentAccount?.pdsUrl && !!ozoneDid,
    staleTime: 30 * 1000,
    initialPageParam: undefined,
    getNextPageParam: (last) => last.cursor,
    queryFn: async ({ pageParam }) => {
      if (!token || !currentAccount?.pdsUrl) {
        return { events: [], cursor: undefined };
      }
      const ozone = ozoneForAccount(currentAccount);
      const response = await ozone.queryEvents(token, ozoneDid, {
        ...filters,
        limit,
        cursor: pageParam,
      });
      try {
        const api = apiForAccount(currentAccount);
        const dids: string[] = [];
        for (const e of response.events) {
          if (e.createdBy) dids.push(e.createdBy);
          const s = subjectDid(e.subject);
          if (s) dids.push(s);
        }
        const avatars = await fetchAvatarsByDid(api, token, dids);
        const enriched: (OzoneModEvent & { creatorAvatar?: string; subjectAvatar?: string })[] =
          response.events.map((e) => ({
            ...e,
            creatorAvatar: avatars.get(e.createdBy),
            subjectAvatar: (() => {
              const sd = subjectDid(e.subject);
              return sd ? avatars.get(sd) : undefined;
            })(),
          }));
        return { events: enriched, cursor: response.cursor };
      } catch {
        return response;
      }
    },
  });
}
