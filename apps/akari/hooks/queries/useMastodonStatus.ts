import { useQuery } from '@tanstack/react-query';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { queryKeys } from '@/hooks/queryKeys';
import {
  fetchMastodonStatus,
  fetchMastodonStatusContext,
  type MastodonStatusContext,
} from '@/utils/mastodon/statusDetail';
import type { MastodonStatus } from '@/utils/mastodon/types';

/**
 * Fetch a single status by its instance-local id. Disabled when there's
 * no Mastodon session — the screen handles the empty state.
 */
export function useMastodonStatus(statusId: string | undefined) {
  const { data: currentAccount } = useCurrentAccount();
  const { data: token } = useJwtToken();
  const instanceUrl = currentAccount?.mastodon?.instanceUrl;

  return useQuery<MastodonStatus>({
    queryKey: queryKeys.mastodonStatus.detail(instanceUrl, statusId),
    queryFn: async () => {
      if (!instanceUrl || !token || !statusId) {
        throw new Error('useMastodonStatus: missing instance, token or id.');
      }
      return await fetchMastodonStatus({ instanceUrl, accessToken: token, statusId });
    },
    enabled: Boolean(instanceUrl && token && statusId && currentAccount?.mastodon),
    staleTime: 60 * 1000,
    retry: false,
  });
}

/**
 * Fetch the ancestor + descendant chains around a status. The combined
 * `[…ancestors, focused, …descendants]` shape is built at the render
 * site rather than here so the focused status can be highlighted.
 */
export function useMastodonStatusContext(statusId: string | undefined) {
  const { data: currentAccount } = useCurrentAccount();
  const { data: token } = useJwtToken();
  const instanceUrl = currentAccount?.mastodon?.instanceUrl;

  return useQuery<MastodonStatusContext>({
    queryKey: queryKeys.mastodonStatusContext.detail(instanceUrl, statusId),
    queryFn: async () => {
      if (!instanceUrl || !token || !statusId) {
        throw new Error('useMastodonStatusContext: missing instance, token or id.');
      }
      return await fetchMastodonStatusContext({ instanceUrl, accessToken: token, statusId });
    },
    enabled: Boolean(instanceUrl && token && statusId && currentAccount?.mastodon),
    staleTime: 60 * 1000,
    retry: false,
  });
}
