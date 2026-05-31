import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { queryKeys } from '@/hooks/queryKeys';
import {
  fetchMastodonAccount,
  fetchMastodonAccountLookup,
  fetchMastodonAccountStatuses,
} from '@/utils/mastodon/accountFetch';
import type { MastodonAccount } from '@/utils/mastodon/types';

/**
 * Resolve an `acct` (`alice` or `alice@instance.com`) to its full
 * `Account`. The profile screen takes acct from the URL and uses this
 * to get both the human-facing payload AND the instance-local id
 * needed to fetch the account's statuses.
 */
export function useMastodonAccountByAcct(acct: string | undefined) {
  const { data: currentAccount } = useCurrentAccount();
  const { data: token } = useJwtToken();
  const instanceUrl = currentAccount?.mastodon?.instanceUrl;

  return useQuery<MastodonAccount>({
    queryKey: queryKeys.mastodonAccountByAcct.detail(instanceUrl, acct),
    queryFn: async () => {
      if (!instanceUrl || !token || !acct) {
        throw new Error('useMastodonAccountByAcct: missing instance, token or acct.');
      }
      return await fetchMastodonAccountLookup({ instanceUrl, accessToken: token, acct });
    },
    enabled: Boolean(instanceUrl && token && acct && currentAccount?.mastodon),
    staleTime: 60 * 1000,
    retry: false,
  });
}

/** Full account fetch by instance-local id. Kept for any future surfaces
 *  that already have the id in hand (notifications, mentions, etc.). */
export function useMastodonProfile(accountId: string | undefined) {
  const { data: currentAccount } = useCurrentAccount();
  const { data: token } = useJwtToken();
  const instanceUrl = currentAccount?.mastodon?.instanceUrl;

  return useQuery<MastodonAccount>({
    queryKey: queryKeys.mastodonProfileAccount.detail(instanceUrl, accountId),
    queryFn: async () => {
      if (!instanceUrl || !token || !accountId) {
        throw new Error('useMastodonProfile: missing instance, token or id.');
      }
      return await fetchMastodonAccount({ instanceUrl, accessToken: token, accountId });
    },
    enabled: Boolean(instanceUrl && token && accountId && currentAccount?.mastodon),
    staleTime: 60 * 1000,
    retry: false,
  });
}

/** Infinite query over an account's authored statuses, max_id-paginated. */
export function useMastodonAccountStatuses(accountId: string | undefined, limit: number = 20) {
  const { data: currentAccount } = useCurrentAccount();
  const { data: token } = useJwtToken();
  const instanceUrl = currentAccount?.mastodon?.instanceUrl;

  return useInfiniteQuery({
    queryKey: queryKeys.mastodonAccountStatuses.list(instanceUrl, accountId, limit),
    queryFn: async ({ pageParam }) => {
      if (!instanceUrl || !token || !accountId) {
        throw new Error('useMastodonAccountStatuses: missing instance, token or id.');
      }
      return await fetchMastodonAccountStatuses({
        instanceUrl,
        accessToken: token,
        accountId,
        limit,
        maxId: pageParam,
      });
    },
    enabled: Boolean(instanceUrl && token && accountId && currentAccount?.mastodon),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextMaxId,
    staleTime: 60 * 1000,
    maxPages: 25,
  });
}
