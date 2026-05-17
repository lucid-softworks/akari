import { useMemo } from 'react';

import type { SortMode } from '@/components/settings/following-cleanup/SortPicker';
import type { Threshold } from '@/components/settings/following-cleanup/ThresholdPicker';
import {
  type FollowingCleanupEntry,
  type FollowingCleanupState,
} from '@/utils/followingCleanupController';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Derive the filtered+sorted "to review" list and the "skipped" list from
 * the raw controller state. Kept as a hook so the parent screen can stay
 * focused on layout instead of array bookkeeping.
 */
export function useFollowingCleanupFilters(
  state: FollowingCleanupState,
  skippedDids: ReadonlySet<string>,
  threshold: Threshold,
  sortMode: SortMode,
  nowMs: number,
) {
  const filteredFollows = useMemo(() => {
    const results: FollowingCleanupEntry[] = [];
    for (const entry of Object.values(state.entries)) {
      if (entry.status !== 'done') continue;
      if (skippedDids.has(entry.profile.did)) continue;
      if (threshold === 'never') {
        if (entry.lastActivityAt === null) results.push(entry);
        continue;
      }
      if (entry.lastActivityAt === null) {
        results.push(entry);
        continue;
      }
      const age = nowMs - new Date(entry.lastActivityAt).getTime();
      if (age >= threshold * DAY_MS) results.push(entry);
    }
    results.sort((a, b) => {
      switch (sortMode) {
        case 'followedAt': {
          // Oldest follow first — null sorts to the bottom (assumed recent).
          const ax = a.followedAt ? new Date(a.followedAt).getTime() : Number.POSITIVE_INFINITY;
          const bx = b.followedAt ? new Date(b.followedAt).getTime() : Number.POSITIVE_INFINITY;
          return ax - bx;
        }
        case 'fewestPosts': {
          const ax = a.profile.postsCount ?? 0;
          const bx = b.profile.postsCount ?? 0;
          return ax - bx;
        }
        case 'mostFollowers': {
          const ax = a.profile.followersCount ?? 0;
          const bx = b.profile.followersCount ?? 0;
          return bx - ax;
        }
        case 'lastActivity':
        default: {
          const ax = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0;
          const bx = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0;
          return ax - bx;
        }
      }
    });
    return results;
  }, [state.entries, threshold, nowMs, skippedDids, sortMode]);

  // Profiles the user has skipped that we actually scanned (so we have
  // the profile object to show in the "skipped" subsection). DIDs without
  // a corresponding entry are kept in the underlying set but invisible
  // here until the next scan resurfaces them.
  const skippedEntries = useMemo(() => {
    const out: FollowingCleanupEntry[] = [];
    for (const did of skippedDids) {
      const entry = state.entries[did];
      if (entry) out.push(entry);
    }
    return out;
  }, [skippedDids, state.entries]);

  return { filteredFollows, skippedEntries };
}
