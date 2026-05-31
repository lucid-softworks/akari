import { useQuery } from '@tanstack/react-query';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { queryKeys } from '@/hooks/queryKeys';
import {
  fetchMastodonAnnouncements,
  type MastodonAnnouncement,
} from '@/utils/mastodon/announcements';

/**
 * Active, non-dismissed announcements for the current Mastodon instance.
 * Mastodon-only — atproto has no equivalent surface (Bluesky's
 * `app.bsky.notification.listNotifications` is per-account, not instance-
 * wide), so this stays gated on `currentAccount.mastodon`.
 *
 * Refetch on focus is on: announcements are infrequent but timely (the
 * point is the instance is telling the user something), and the typical
 * cost is one empty array per refocus.
 */
export function useMastodonAnnouncements() {
  const { data: currentAccount } = useCurrentAccount();
  const { data: token } = useJwtToken();
  const instanceUrl = currentAccount?.mastodon?.instanceUrl;
  const accountId = currentAccount?.mastodon?.accountId;

  return useQuery<MastodonAnnouncement[]>({
    queryKey: queryKeys.mastodonAnnouncements.list(instanceUrl, accountId),
    queryFn: async () => {
      if (!instanceUrl || !token) {
        throw new Error('useMastodonAnnouncements: missing instance or token.');
      }
      return await fetchMastodonAnnouncements({ instanceUrl, accessToken: token });
    },
    enabled: Boolean(instanceUrl && token && currentAccount?.mastodon),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: false,
  });
}
