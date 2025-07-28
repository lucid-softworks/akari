import { useQuery } from "@tanstack/react-query";

import { blueskyApi } from "@/utils/blueskyApi";
import { jwtStorage } from "@/utils/secureStorage";

/**
 * Query hook for fetching posts that a user has liked
 * @param identifier - The user's handle or DID
 * @param enabled - Whether the query should be enabled (default: true)
 */
export function useAuthorLikes(identifier: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ["authorLikes", identifier],
    queryFn: async () => {
      const token = jwtStorage.getToken();
      if (!token) throw new Error("No access token");

      const feed = await blueskyApi.getAuthorFeed(token, identifier, 50);

      // Filter to only show posts that the user has liked
      const likes = feed.feed
        .filter((item) => {
          // Only include posts that the user has liked
          return item.post.viewer?.like;
        })
        .map((item) => item.post);

      // Deduplicate posts by URI to prevent duplicate keys
      const uniqueLikes = likes.filter(
        (post, index, self) =>
          index === self.findIndex((p) => p.uri === post.uri)
      );

      return uniqueLikes;
    },
    enabled: enabled && !!identifier,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
