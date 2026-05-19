import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useOzoneDid } from '@/hooks/useOzoneSettings';
import { queryKeys } from '@/hooks/queryKeys';
import { ozoneForAccount } from '@/utils/blueskyOzone';

export type OzoneScheduledStatus = 'pending' | 'executed' | 'cancelled' | 'failed';

export function useOzoneScheduledActions(statuses: OzoneScheduledStatus[] = ['pending']) {
  const { data: currentAccount } = useCurrentAccount();
  const { data: token } = useJwtToken();
  const ozoneDid = useOzoneDid();
  return useQuery<Record<string, unknown>[]>({
    queryKey: queryKeys.ozone.scheduled(ozoneDid, statuses),
    enabled: !!token && !!currentAccount?.pdsUrl && !!ozoneDid,
    staleTime: 30 * 1000,
    queryFn: async () => {
      if (!token || !currentAccount?.pdsUrl) return [];
      const ozone = ozoneForAccount(currentAccount);
      const response = await ozone.listScheduledActions(token, ozoneDid, { statuses });
      return response.actions;
    },
  });
}

export function useCancelOzoneScheduledActions() {
  const { data: currentAccount } = useCurrentAccount();
  const { data: token } = useJwtToken();
  const ozoneDid = useOzoneDid();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ subjects, comment }: { subjects: string[]; comment?: string }) => {
      if (!token || !currentAccount?.pdsUrl) {
        throw new Error('cancelScheduledActions: missing session or PDS');
      }
      const ozone = ozoneForAccount(currentAccount);
      return ozone.cancelScheduledActions(token, ozoneDid, subjects, comment);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.ozone.all });
    },
  });
}
