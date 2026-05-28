import type { BlueskyFeedItem, BlueskyMutedWord, BlueskyPostView } from '@/bluesky-api';
import type { FeedFilters } from '@/hooks/useFeedFilters';
import { isPostMuted } from '@/utils/mutedWordsFilter';

/**
 * The reply / quote checks for a single post — shared by `shouldHideFeedItem`
 * and `shouldHidePost` so the rules don't drift between feed-list surfaces
 * (home, profile posts) and post-list surfaces (search results).
 */
function postIsReply(post: BlueskyPostView): boolean {
  return Boolean((post.record as { reply?: unknown } | undefined)?.reply);
}

/**
 * Has the viewer engaged with this post? Counts likes, reposts, and replies
 * — anything where the AppView is reporting back a viewer-side reference
 * URI for that interaction. Bookmarks could go in here later if we ever
 * need to drop them from "show me what's new" passes.
 */
function viewerEngagedWith(post: BlueskyPostView): boolean {
  const viewer = post.author && (post as BlueskyPostView).viewer;
  if (!viewer) return false;
  return Boolean(viewer.like || viewer.repost || viewer.reply);
}

function postIsQuote(post: BlueskyPostView): boolean {
  const embedType = (post.embed as { $type?: string } | undefined)?.$type;
  return (
    embedType === 'app.bsky.embed.record#view' ||
    embedType === 'app.bsky.embed.recordWithMedia#view'
  );
}

function getBookmarkCount(post: BlueskyPostView): number | undefined {
  const value = (post as { bookmarkCount?: unknown }).bookmarkCount;
  return typeof value === 'number' ? value : undefined;
}

function outOfRange(count: number | undefined, min: number | undefined, max: number | undefined): boolean {
  if (count === undefined) return false; // missing data — don't filter
  if (min !== undefined && count < min) return true;
  if (max !== undefined && count > max) return true;
  return false;
}

function authorFails(post: BlueskyPostView, filters: FeedFilters): boolean {
  if (!filters.onlyFollowing && !filters.onlyMutuals) return false;
  const viewer = post.author?.viewer;
  const following = !!viewer?.following;
  const followedBy = !!viewer?.followedBy;
  if (filters.onlyMutuals) return !(following && followedBy);
  if (filters.onlyFollowing) return !following;
  return false;
}

function postFailsCounts(post: BlueskyPostView, filters: FeedFilters): boolean {
  if (outOfRange(post.likeCount, filters.minLikes, filters.maxLikes)) return true;
  if (outOfRange(post.repostCount, filters.minReposts, filters.maxReposts)) return true;
  if (outOfRange(post.replyCount, filters.minReplies, filters.maxReplies)) return true;
  if (outOfRange(getBookmarkCount(post), filters.minBookmarks, filters.maxBookmarks)) return true;
  return false;
}

/**
 * Apply the user's persistent feed-filter toggles to a feed entry.
 * Returns true when the entry should be hidden from the rendered list.
 *
 * `applyHideReplies` is opt-in per call site — surfaces that exist to show
 * replies (a profile's "Replies" tab, a thread view) should pass `false` so
 * the toggle doesn't empty them out.
 */
export function shouldHideFeedItem(
  item: BlueskyFeedItem,
  filters: FeedFilters,
  options: { applyHideReplies?: boolean } = {},
): boolean {
  const { applyHideReplies = true } = options;

  if (filters.hideReposts && item.reason) return true;
  if (applyHideReplies && filters.hideReplies && postIsReply(item.post)) return true;
  if (filters.hideQuotes && postIsQuote(item.post)) return true;
  if (filters.hideEngaged && viewerEngagedWith(item.post)) return true;
  if (authorFails(item.post, filters)) return true;
  if (postFailsCounts(item.post, filters)) return true;

  return false;
}

/**
 * Apply the viewer's muted-word rules and a feed's filter toggles to a list
 * of feed items. The shared display pass for every feed surface (home feed,
 * following timeline, standalone feed viewer) so the rules don't drift.
 */
export function filterFeedItems(
  items: BlueskyFeedItem[],
  filters: FeedFilters,
  mutedWords: readonly BlueskyMutedWord[],
): BlueskyFeedItem[] {
  return items.filter((entry) => {
    if (mutedWords.length && isPostMuted(entry.post, mutedWords)) return false;
    if (shouldHideFeedItem(entry, filters)) return false;
    return true;
  });
}

