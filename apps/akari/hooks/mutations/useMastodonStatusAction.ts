import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { queryKeys } from '@/hooks/queryKeys';
import {
  mastodonStatusAction,
  type MastodonStatusActionKind,
} from '@/utils/mastodon/statusActions';
import type { MastodonStatus } from '@/utils/mastodon/types';

type Input = {
  statusId: string;
  action: MastodonStatusActionKind;
  /** `true` to apply the action, `false` to undo. */
  value: boolean;
};

type InfinitePage = { statuses: MastodonStatus[]; nextMaxId: string | undefined };
type InfiniteCache = { pages: InfinitePage[]; pageParams: unknown[] } | undefined;

/**
 * Patch a status in every cached Mastodon timeline page that contains it.
 * Statuses appear in the home and trending feeds (and may appear via a
 * reblog wrapper too — we patch both the outer status and the inner
 * `reblog` when ids match).
 */
function patchStatusInCache(
  cache: InfiniteCache,
  statusId: string,
  patch: Partial<MastodonStatus>,
): InfiniteCache {
  if (!cache) return cache;
  const applyPatch = (s: MastodonStatus): MastodonStatus => {
    if (s.id === statusId) return { ...s, ...patch };
    if (s.reblog && s.reblog.id === statusId) {
      return { ...s, reblog: { ...s.reblog, ...patch } };
    }
    return s;
  };
  return {
    ...cache,
    pages: cache.pages.map((page) => ({
      ...page,
      statuses: page.statuses.map(applyPatch),
    })),
  };
}

/**
 * Toggle favourite / reblog / bookmark on a Mastodon status. Optimistic:
 * flips both the flag and the count in every cached timeline page that
 * holds the status, then reconciles against the server's response (or
 * reverts on error).
 *
 * Counts are predicted as `±1` from the current value. For the rare case
 * where the optimistic delta diverges from the server (e.g. someone else
 * removed their favourite between our read and write), the `onSuccess`
 * write-through restores the canonical count.
 */
export function useMastodonStatusAction() {
  const queryClient = useQueryClient();
  const { data: currentAccount } = useCurrentAccount();
  const { data: token } = useJwtToken();
  const instanceUrl = currentAccount?.mastodon?.instanceUrl;

  return useMutation<
    MastodonStatus,
    Error,
    Input,
    { snapshots: { key: readonly unknown[]; data: InfiniteCache }[] }
  >({
    mutationFn: async ({ statusId, action, value }) => {
      if (!instanceUrl) throw new Error('Status action requires a Mastodon account.');
      if (!token) throw new Error('Status action requires a signed-in session.');
      return await mastodonStatusAction({ instanceUrl, accessToken: token, statusId, action, value });
    },
    onMutate: async (input) => {
      // Patch every timeline cache that's currently mounted — home,
      // trending, and any future Mastodon-status-bearing query (profile
      // feeds, bookmarks list, etc). Snapshot each so we can revert.
      const affectedQueries = queryClient.getQueriesData<InfiniteCache>({
        queryKey: queryKeys.mastodonHomeTimeline.all,
      });
      const trendingQueries = queryClient.getQueriesData<InfiniteCache>({
        queryKey: queryKeys.mastodonTrendingTimeline.all,
      });
      const all = [...affectedQueries, ...trendingQueries];
      const snapshots = all.map(([key, data]) => ({ key, data }));

      const fieldMap: Record<MastodonStatusActionKind, keyof MastodonStatus> = {
        favourite: 'favourited',
        reblog: 'reblogged',
        bookmark: 'bookmarked',
      };
      const countMap: Partial<Record<MastodonStatusActionKind, keyof MastodonStatus>> = {
        favourite: 'favourites_count',
        reblog: 'reblogs_count',
      };

      for (const [key] of all) {
        queryClient.setQueryData<InfiniteCache>(key, (cache) => {
          if (!cache) return cache;
          // Build the patch from the current value of the matched status —
          // peek into the first matching page to pick a base count.
          const flagField = fieldMap[input.action];
          const countField = countMap[input.action];
          const patch: Partial<MastodonStatus> = { [flagField]: input.value } as Partial<MastodonStatus>;
          if (countField) {
            // Find any occurrence to read the current count off, then ±1.
            for (const page of cache.pages) {
              for (const s of page.statuses) {
                const match = s.id === input.statusId
                  ? s
                  : s.reblog?.id === input.statusId ? s.reblog : null;
                if (match) {
                  const current = (match as MastodonStatus)[countField] as number;
                  (patch as Record<string, unknown>)[countField] =
                    Math.max(0, current + (input.value ? 1 : -1));
                  break;
                }
              }
            }
          }
          return patchStatusInCache(cache, input.statusId, patch);
        });
      }
      return { snapshots };
    },
    onSuccess: (updated) => {
      // Reconcile from the server response so any drift from the ±1
      // optimistic delta gets corrected.
      const all = queryClient.getQueriesData<InfiniteCache>({
        queryKey: queryKeys.mastodonHomeTimeline.all,
      });
      const trending = queryClient.getQueriesData<InfiniteCache>({
        queryKey: queryKeys.mastodonTrendingTimeline.all,
      });
      for (const [key] of [...all, ...trending]) {
        queryClient.setQueryData<InfiniteCache>(key, (cache) =>
          patchStatusInCache(cache, updated.id, updated),
        );
      }
    },
    onError: (_err, _input, context) => {
      if (!context) return;
      for (const { key, data } of context.snapshots) {
        queryClient.setQueryData(key, data);
      }
    },
  });
}
