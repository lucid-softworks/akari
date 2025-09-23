import type { BlueskyFeed, BlueskySavedFeedItem } from '@/bluesky-api';

export type SavedFeedWithMetadata = BlueskySavedFeedItem & {
  metadata: BlueskyFeed | null;
};
