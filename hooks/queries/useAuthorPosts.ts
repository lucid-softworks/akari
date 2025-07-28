import { useQuery } from "@tanstack/react-query";

import { blueskyApi } from "@/utils/blueskyApi";
import { jwtStorage } from "@/utils/secureStorage";

/**
 * Query hook for fetching a user's original posts (not replies or reposts)
 * @param identifier - The user's handle or DID
 * @param enabled - Whether the query should be enabled (default: true)
 */
export function useAuthorPosts(identifier: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ["authorPosts", identifier],
    queryFn: async () => {
      const token = jwtStorage.getToken();
      if (!token) throw new Error("No access token");

      const feed = await blueskyApi.getAuthorFeed(token, identifier, 50);

      // Filter to only show original posts (not reposts or replies)
      const originalPosts = feed.feed
        .filter((item) => {
          // Only include posts that are not reposts and not replies
          return !item.reason && !item.reply;
        })
        .map((item) => item.post);

      // Deduplicate posts by URI to prevent duplicate keys
      const uniqueOriginalPosts = originalPosts.filter(
        (post, index, self) =>
          index === self.findIndex((p) => p.uri === post.uri)
      );

      return uniqueOriginalPosts;
    },
    enabled: enabled && !!identifier,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
