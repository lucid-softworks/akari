import { useQuery } from '@tanstack/react-query';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { queryKeys } from '@/hooks/queryKeys';
import { apiForAccount } from '@/utils/blueskyApi';

/**
 * Fetches the raw `app.bsky.actor.profile/self` record for the current
 * user. Used by settings screens that need to read or write fields not
 * surfaced through `app.bsky.actor.getProfile` (e.g. self-labels).
 */
export function useProfileRecord() {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useQuery({
    queryKey: queryKeys.profile.record(currentAccount?.did, currentAccount?.pdsUrl),
    enabled: !!token && !!currentAccount?.did && !!currentAccount?.pdsUrl,
    queryFn: async () => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');
      if (!currentAccount?.did) throw new Error('No user DID available');
      const api = apiForAccount(currentAccount);
      return api.getProfileRecord(token, currentAccount.did);
    },
  });
}

const NO_UNAUTH_LABEL = '!no-unauthenticated';
const AUTOMATED_LABEL = 'automated';

type SelfLabels = {
  $type?: string;
  values?: { val: string }[];
};

function hasSelfLabel(
  record: { value: Record<string, unknown> } | null | undefined,
  target: string,
): boolean {
  const labels = (record?.value?.labels as SelfLabels | undefined) ?? undefined;
  if (!labels?.values) return false;
  return labels.values.some((entry) => entry?.val === target);
}

/**
 * True when the user's profile carries the `!no-unauthenticated` self-label.
 */
export function isLoggedOutVisibilityDiscouraged(
  record: { value: Record<string, unknown> } | null | undefined,
): boolean {
  return hasSelfLabel(record, NO_UNAUTH_LABEL);
}

/**
 * True when the user's profile carries the `automated` self-label,
 * marking the account as a bot or other automated poster.
 */
export function isAccountAutomated(
  record: { value: Record<string, unknown> } | null | undefined,
): boolean {
  return hasSelfLabel(record, AUTOMATED_LABEL);
}
