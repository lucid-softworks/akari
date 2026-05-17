import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { queryKeys } from '@/hooks/queryKeys';
import { apiForAccount } from '@/utils/blueskyApi';
export type ReportReasonType =
  | 'reasonSpam'
  | 'reasonViolation'
  | 'reasonMisleading'
  | 'reasonSexual'
  | 'reasonRude'
  | 'reasonOther';

export type ReportSubject =
  | { type: 'account'; did: string }
  | { type: 'post'; uri: string; cid: string };

export function useReport() {
  const queryClient = useQueryClient();
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useMutation({
    mutationFn: async ({
      subject,
      reasonType,
      reason,
      labelerDid,
    }: {
      subject: ReportSubject;
      reasonType: ReportReasonType;
      reason?: string;
      /** Optional labeler service DID — when present the report is routed to
       * that labeler via the `atproto-proxy` header. Defaults to the user's PDS. */
      labelerDid?: string;
    }) => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');

      const api = apiForAccount(currentAccount);
      const subjectPayload = subject.type === 'account'
        ? { did: subject.did }
        : { uri: subject.uri, cid: subject.cid };

      return await api.createReport(token, subjectPayload, reasonType, reason, labelerDid);
    },
    onSuccess: (_data, variables) => {
      // Labelers may attach a label asynchronously after a report — refresh
      // the subject so any new labels propagate through the UI on next view.
      if (variables.subject.type === 'account') {
        queryClient.invalidateQueries({ queryKey: queryKeys.profile.forDid(variables.subject.did) });
      } else {
        queryClient.invalidateQueries({ queryKey: queryKeys.post.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.postThread.all });
      }
    },
  });
}
