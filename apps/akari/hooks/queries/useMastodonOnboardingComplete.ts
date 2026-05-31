import { useQuery } from '@tanstack/react-query';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { storage } from '@/utils/secureStorage';

const ONBOARDING_QUERY_KEY = ['mastodonOnboardingComplete'] as const;

function readMap(): Record<string, boolean> {
  return storage.getItem('mastodonOnboardingComplete') ?? {};
}

/**
 * Whether the current Mastodon account has already been through the
 * onboarding flow (profile setup + follow suggestions). Returns `false`
 * for non-Mastodon accounts and when no account is signed in, so the
 * guard upstream can treat any falsy value as "don't redirect."
 *
 * Reads MMKV directly via `initialData` so the first render returns the
 * persisted value synchronously — no flash through "loading" that would
 * race the home-tab redirect guard.
 */
export function useIsMastodonOnboardingComplete(): boolean {
  const { data: currentAccount } = useCurrentAccount();
  const accountKey = currentAccount?.did;
  const { data } = useQuery({
    queryKey: [...ONBOARDING_QUERY_KEY, accountKey],
    queryFn: () => readMap()[accountKey ?? ''] === true,
    initialData: () => readMap()[accountKey ?? ''] === true,
    staleTime: Infinity,
    gcTime: Infinity,
    enabled: Boolean(accountKey),
    meta: { persist: false },
  });
  return Boolean(data);
}

/**
 * Persist that the given Mastodon account has finished (or skipped) the
 * onboarding flow. Writes to MMKV and invalidates the query so any live
 * `useIsMastodonOnboardingComplete` subscribers see the new value.
 */
export function markMastodonOnboardingComplete(
  did: string,
  queryClient: { invalidateQueries: (opts: { queryKey: readonly unknown[] }) => unknown },
): void {
  const next = { ...readMap(), [did]: true };
  storage.setItem('mastodonOnboardingComplete', next);
  queryClient.invalidateQueries({ queryKey: ONBOARDING_QUERY_KEY });
}

export { ONBOARDING_QUERY_KEY as MASTODON_ONBOARDING_QUERY_KEY };
