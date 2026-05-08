import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV({ id: 'feed-filters' });

const STORAGE_KEY = 'per_feed_filters_v2';

export type FeedFilters = {
  /** Drop entries whose post is a reply to another post. */
  hideReplies: boolean;
  /** Drop entries that arrive as a repost of someone else's post. */
  hideReposts: boolean;
  /** Drop entries whose post quotes another post (record / recordWithMedia embed). */
  hideQuotes: boolean;
  /**
   * Drop entries the viewer has already interacted with — liked, reposted,
   * or replied to. Useful for "show me what's new" passes through a feed.
   */
  hideEngaged: boolean;
  /** Restrict to authors the viewer follows (`viewer.following` is set). */
  onlyFollowing: boolean;
  /** Restrict to mutuals — viewer follows AND is followed back. */
  onlyMutuals: boolean;
  /** Inclusive engagement-count bounds. `undefined` means unbounded on that side. */
  minLikes?: number;
  maxLikes?: number;
  minReposts?: number;
  maxReposts?: number;
  minReplies?: number;
  maxReplies?: number;
  /** Bookmark-count bounds — only applied when the post view exposes the field. */
  minBookmarks?: number;
  maxBookmarks?: number;
};

export const DEFAULT_FILTERS: FeedFilters = {
  hideReplies: false,
  hideReposts: false,
  hideQuotes: false,
  hideEngaged: false,
  onlyFollowing: false,
  onlyMutuals: false,
};

type FilterMap = Record<string, FeedFilters>;

let cached: FilterMap | null = null;
const listeners = new Set<() => void>();

function readAll(): FilterMap {
  try {
    const raw = storage.getString(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as FilterMap;
  } catch {
    return {};
  }
}

function writeAll(map: FilterMap): void {
  storage.set(STORAGE_KEY, JSON.stringify(map));
  cached = map;
  for (const fn of listeners) fn();
}

function getSnapshot(): FilterMap {
  if (!cached) cached = readAll();
  return cached;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function isFilterActive(filters: FeedFilters): boolean {
  return (
    filters.hideReplies ||
    filters.hideReposts ||
    filters.hideQuotes ||
    filters.hideEngaged ||
    filters.onlyFollowing ||
    filters.onlyMutuals ||
    filters.minLikes !== undefined ||
    filters.maxLikes !== undefined ||
    filters.minReposts !== undefined ||
    filters.maxReposts !== undefined ||
    filters.minReplies !== undefined ||
    filters.maxReplies !== undefined ||
    filters.minBookmarks !== undefined ||
    filters.maxBookmarks !== undefined
  );
}

/**
 * Per-feed filter state, persisted on a dedicated MMKV instance keyed by the
 * caller's `feedKey` (typically the feed URI — `following` for the home
 * timeline, `at://.../feed/xyz` for custom feeds, etc.). Each feed gets its
 * own settings so users can hide replies on Discover but keep them on
 * Following.
 *
 * Pass `null` / `undefined` for an unset feed; the hook returns the defaults
 * and the setters become no-ops so consumers don't have to gate every call.
 */
export function useFeedFilters(feedKey: string | null | undefined) {
  const map = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const filters = useMemo<FeedFilters>(() => {
    if (!feedKey) return DEFAULT_FILTERS;
    return { ...DEFAULT_FILTERS, ...(map[feedKey] ?? {}) };
  }, [feedKey, map]);

  const update = useCallback(
    (patch: Partial<FeedFilters>) => {
      if (!feedKey) return;
      const next = { ...readAll() };
      const previous = next[feedKey] ?? DEFAULT_FILTERS;
      const merged = { ...previous, ...patch } as FeedFilters;
      // Strip undefined numeric bounds so the JSON stays compact and
      // `isFilterActive` checks can rely on `=== undefined`.
      for (const key of Object.keys(merged) as (keyof FeedFilters)[]) {
        if (merged[key] === undefined) delete (merged as Record<string, unknown>)[key];
      }
      next[feedKey] = merged;
      writeAll(next);
    },
    [feedKey],
  );

  const reset = useCallback(() => {
    if (!feedKey) return;
    const next = { ...readAll() };
    delete next[feedKey];
    writeAll(next);
  }, [feedKey]);

  const anyFilterActive = isFilterActive(filters);

  return {
    filters,
    update,
    reset,
    anyFilterActive,
  };
}
