import { useQuery } from "@tanstack/react-query";

import { useJwtToken } from "@/hooks/queries/useJwtToken";
import { blueskyApi } from "@/utils/blueskyApi";

/**
 * Query hook for fetching a user's original posts (not replies or reposts)
 * @param identifier - The user's handle or DID
 */
export function useAuthorPosts(identifier: string | undefined) {
  const { data: token } = useJwtToken();

  return useQuery({
    queryKey: ["authorPosts", identifier],
    queryFn: async () => {
      if (!token) throw new Error("No access token");
      if (!identifier) throw new Error("No identifier provided");

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
    enabled: !!identifier && !!token,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
