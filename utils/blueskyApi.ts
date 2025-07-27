// Import the main API class and types
import { BlueskyApi } from "./bluesky/api";
import type {
  BlueskyError,
  BlueskyFeed,
  BlueskyFeedItem,
  BlueskyFeedResponse,
  BlueskyFeedsResponse,
  BlueskyPostView,
  BlueskySession,
} from "./bluesky/types";

// Export the main API class
export { BlueskyApi };

// Export all types
export type {
  BlueskyError,
  BlueskyFeed,
  BlueskyFeedItem,
  BlueskyFeedResponse,
  BlueskyFeedsResponse,
  BlueskyPostView,
  BlueskySession,
};

// Create and export the default instance
export const blueskyApi = new BlueskyApi();
