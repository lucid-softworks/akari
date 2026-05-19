import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { OzoneEmitEventInput, OzoneModEvent } from 'bluesky-ozone';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { queryKeys } from '@/hooks/queryKeys';
import { useOzoneDid } from '@/hooks/useOzoneSettings';
import { ozoneForAccount } from '@/utils/blueskyOzone';

/**
 * Emit a moderation event (`tools.ozone.moderation.emitEvent`).
 *
 * The single endpoint handles every event subtype — comment, label,
 * takedown, escalate, mute, tag, etc. — selected via `event.$type`.
 * On success the queue and event log are invalidated so the new row
 * appears without a manual refresh.
 */
export function useEmitOzoneEvent() {
  const { data: currentAccount } = useCurrentAccount();
  const { data: token } = useJwtToken();
  const ozoneDid = useOzoneDid();
  const queryClient = useQueryClient();

  return useMutation<
    OzoneModEvent,
    Error,
    Omit<OzoneEmitEventInput, 'createdBy'> & { createdBy?: string }
  >({
    mutationFn: async (input) => {
      const createdBy = input.createdBy ?? currentAccount?.did;
      if (!token || !currentAccount?.pdsUrl || !createdBy) {
        throw new Error('emitEvent: missing session, PDS, or current DID');
      }
      const client = ozoneForAccount(currentAccount);
      return client.emitEvent(token, ozoneDid, { ...input, createdBy });
    },
    onSuccess: () => {
      // Refresh the rows the event likely affected. Broad invalidation
      // here is fine — Ozone responses are small and queue/event lists
      // are page-level.
      void queryClient.invalidateQueries({ queryKey: queryKeys.ozone.all });
    },
  });
}
