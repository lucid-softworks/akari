import { useQuery } from '@tanstack/react-query';
import type { OzoneModEvent, OzoneSubjectStatus } from 'bluesky-ozone';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useOzoneDid } from '@/hooks/useOzoneSettings';
import { queryKeys } from '@/hooks/queryKeys';
import { apiForAccount } from '@/utils/blueskyApi';
import { ozoneForAccount } from '@/utils/blueskyOzone';
import { fetchAvatarsByDid, subjectDid } from '@/utils/ozoneAvatars';

/**
 * Look up a single subject's current status. Used by the detail pane to
 * decide which badges to render and to feed the action sheet.
 *
 * `subject` is a DID for accounts or an AT URI for records. The Ozone
 * lexicon accepts either via the same `subject` query param.
 */
export function useOzoneSubjectStatus(subject: string | undefined) {
  const { data: currentAccount } = useCurrentAccount();
  const { data: token } = useJwtToken();
  const ozoneDid = useOzoneDid();

  return useQuery<OzoneSubjectStatus | undefined>({
    queryKey: queryKeys.ozone.subjectStatus(ozoneDid, subject),
    enabled: !!subject && !!token && !!currentAccount?.pdsUrl,
    staleTime: 30 * 1000,
    queryFn: async () => {
      if (!subject) return undefined;
      if (!token || !currentAccount?.pdsUrl) return undefined;
      const ozone = ozoneForAccount(currentAccount);
      const response = await ozone.queryStatuses(token, ozoneDid, {
        subject,
        limit: 1,
      });
      return response.subjectStatuses[0];
    },
  });
}

/**
 * Full event history for one subject. Drives the detail pane's audit
 * trail and the reporter sidebar.
 */
export function useOzoneSubjectEvents(subject: string | undefined, limit = 50) {
  const { data: currentAccount } = useCurrentAccount();
  const { data: token } = useJwtToken();
  const ozoneDid = useOzoneDid();

  return useQuery<(OzoneModEvent & { creatorAvatar?: string; subjectAvatar?: string })[]>({
    queryKey: queryKeys.ozone.subjectEvents(ozoneDid, subject),
    enabled: !!subject && !!token && !!currentAccount?.pdsUrl,
    staleTime: 30 * 1000,
    queryFn: async () => {
      if (!subject) return [];
      if (!token || !currentAccount?.pdsUrl) return [];
      const ozone = ozoneForAccount(currentAccount);
      const response = await ozone.queryEvents(token, ozoneDid, {
        subject,
        limit,
        includeAllUserRecords: subject.startsWith('did:'),
        sortDirection: 'desc',
      });
      try {
        const api = apiForAccount(currentAccount);
        const dids: string[] = [];
        for (const e of response.events) {
          if (e.createdBy) dids.push(e.createdBy);
          const sd = subjectDid(e.subject);
          if (sd) dids.push(sd);
        }
        const avatars = await fetchAvatarsByDid(api, token, dids);
        return response.events.map((e) => ({
          ...e,
          creatorAvatar: avatars.get(e.createdBy),
          subjectAvatar: (() => {
            const sd = subjectDid(e.subject);
            return sd ? avatars.get(sd) : undefined;
          })(),
        }));
      } catch {
        return response.events;
      }
    },
  });
}
