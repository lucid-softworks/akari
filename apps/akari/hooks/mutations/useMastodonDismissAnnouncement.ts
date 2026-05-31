import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { queryKeys } from '@/hooks/queryKeys';
import {
  dismissMastodonAnnouncement,
  type MastodonAnnouncement,
} from '@/utils/mastodon/announcements';

/**
 * Dismiss a Mastodon announcement. Optimistically removes the entry from
 * the cached list so the card disappears immediately; on error, refetches
 * to recover the canonical server state rather than re-inserting blindly
 * (the user might have dismissed it from another client meanwhile).
 */
export function useMastodonDismissAnnouncement() {
  const queryClient = useQueryClient();
  const { data: currentAccount } = useCurrentAccount();
  const { data: token } = useJwtToken();
  const instanceUrl = currentAccount?.mastodon?.instanceUrl;
  const accountId = currentAccount?.mastodon?.accountId;
  const queryKey = queryKeys.mastodonAnnouncements.list(instanceUrl, accountId);

  return useMutation<void, Error, string, { previous: MastodonAnnouncement[] | undefined }>({
    mutationFn: async (announcementId: string) => {
      if (!instanceUrl || !token) {
        throw new Error('Dismiss requires a Mastodon account.');
      }
      return await dismissMastodonAnnouncement({
        instanceUrl,
        accessToken: token,
        announcementId,
      });
    },
    onMutate: async (announcementId) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<MastodonAnnouncement[]>(queryKey);
      queryClient.setQueryData<MastodonAnnouncement[]>(queryKey, (current) =>
        (current ?? []).filter((a) => a.id !== announcementId),
      );
      return { previous };
    },
    onError: (_err, _announcementId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      // Background refetch so we don't drift from server truth if the
      // optimistic revert is stale (e.g. user dismissed from another tab).
      queryClient.invalidateQueries({ queryKey });
    },
  });
}
