import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';

import type { BlueskyProfile } from '@/bluesky-api';
import { useToast } from '@/contexts/ToastContext';
import { useFollowUser } from '@/hooks/mutations/useFollowUser';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useTranslation } from '@/hooks/useTranslation';
import { apiForAccount } from '@/utils/blueskyApi';
import {
  type FollowingCleanupState,
  followingCleanupQueryKey,
  getFollowingCleanupController,
  initialFollowingCleanupState,
} from '@/utils/followingCleanupController';

/**
 * Binds the following-cleanup controller singleton to React Query state
 * and exposes the start/pause/clear/unfollow actions the screen needs.
 * Pulling this out of the screen component keeps the render body focused
 * on layout, not on the scan lifecycle plumbing.
 */
export function useFollowingCleanupController() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();
  const followMutation = useFollowUser();

  const accountDid = currentAccount?.did;

  // React Query is the source of truth for the scan state — the controller
  // writes here on a flush interval so the data persists across navigation
  // and shows up live in devtools. We use `initialData` (synchronous) rather
  // than a `queryFn` to avoid a race where the queryFn's resolved promise
  // clobbers an early controller flush on a freshly-mounted screen.
  //
  // `meta.persist: false` opts this query out of the app-wide MMKV-backed
  // PersistQueryClientProvider — otherwise the scan would appear to "still
  // be running" after a web reload even though the controller singleton
  // (which holds the worker pool) is gone. We want a clean Start button
  // on every cold load.
  const stateQuery = useQuery<FollowingCleanupState>({
    queryKey: followingCleanupQueryKey(accountDid),
    enabled: !!accountDid,
    queryFn: () => initialFollowingCleanupState(),
    initialData: () => initialFollowingCleanupState(),
    staleTime: Infinity,
    gcTime: Infinity,
    meta: { persist: false },
  });

  const state = stateQuery.data ?? initialFollowingCleanupState();

  // Reconcile any rehydrated cache state with the live controller. If the
  // app's PersistQueryClientProvider restored a snapshot saved mid-scan
  // (from before `meta.persist: false` was applied), the cached state can
  // claim "running" even though the worker pool was wiped on web reload.
  useEffect(() => {
    if (!accountDid) return;
    const ctrl = getFollowingCleanupController(queryClient, accountDid);
    const live = ctrl.getState();
    queryClient.setQueryData(followingCleanupQueryKey(accountDid), {
      ...live,
      entries: { ...live.entries },
    });
  }, [accountDid, queryClient]);

  const start = useCallback(() => {
    if (!token || !currentAccount?.pdsUrl || !accountDid) {
      showToast({ type: 'error', message: t('common.somethingWentWrong') });
      return;
    }
    const ctrl = getFollowingCleanupController(queryClient, accountDid);
    const api = apiForAccount(currentAccount);
    ctrl.start({ api, token }).catch((err) => {
      // start() shouldn't throw — producers/workers catch internally — but
      // surface any unhandled error to the console so a broken scan isn't
      // silent.
      console.error('Following cleanup scan failed:', err);
      showToast({ type: 'error', message: t('common.somethingWentWrong') });
    });
  }, [accountDid, currentAccount, queryClient, showToast, t, token]);

  const pause = useCallback(() => {
    if (!accountDid) return;
    const ctrl = getFollowingCleanupController(queryClient, accountDid);
    ctrl.pause();
  }, [accountDid, queryClient]);

  const clear = useCallback(() => {
    if (!accountDid) return;
    const ctrl = getFollowingCleanupController(queryClient, accountDid);
    ctrl.clear();
  }, [accountDid, queryClient]);

  const unfollow = useCallback(
    (profile: BlueskyProfile) => {
      const followUri = profile.viewer?.following;
      if (!followUri) {
        showToast({ type: 'error', message: t('settings.followingCleanup.unfollowFailed') });
        return;
      }
      if (!accountDid) return;
      const ctrl = getFollowingCleanupController(queryClient, accountDid);
      const previousEntry = ctrl.getState().entries[profile.did];

      // Optimistically remove so the row disappears immediately. If the
      // server rejects, we restore the entry from the snapshot we just
      // captured.
      ctrl.removeProfile(profile.did);

      followMutation.mutate(
        { did: profile.did, followUri, action: 'unfollow' },
        {
          onError: () => {
            if (previousEntry) ctrl.restoreEntry(previousEntry);
            showToast({ type: 'error', message: t('settings.followingCleanup.unfollowFailed') });
          },
        },
      );
    },
    [accountDid, followMutation, queryClient, showToast, t],
  );

  return {
    accountDid,
    currentAccount,
    token,
    state,
    start,
    pause,
    clear,
    unfollow,
    unfollowPending: followMutation.isPending,
  };
}
