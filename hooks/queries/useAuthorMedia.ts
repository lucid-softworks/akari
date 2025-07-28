import { useQuery } from "@tanstack/react-query";

import { blueskyApi } from "@/utils/blueskyApi";
import { jwtStorage } from "@/utils/secureStorage";

/**
 * Query hook for fetching a user's posts with media
 * @param identifier - The user's handle or DID
 * @param enabled - Whether the query should be enabled (default: true)
 */
export function useAuthorMedia(identifier: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ["authorMedia", identifier],
    queryFn: async () => {
      const token = jwtStorage.getToken();
      if (!token) throw new Error("No access token");

      const feed = await blueskyApi.getAuthorFeed(token, identifier, 50);

      // Filter to only show posts with media (images, videos, etc.)
      const mediaPosts = feed.feed
        .filter((item) => {
          // Only include posts that have media (embeds)
          return (
            item.post.embed &&
            (item.post.embed.$type === "app.bsky.embed.images#view" ||
              item.post.embed.$type === "app.bsky.embed.external#view" ||
              item.post.embed.$type === "app.bsky.embed.record#view" ||
              item.post.embed.$type === "app.bsky.embed.recordWithMedia#view" ||
              item.post.embeds?.some(
                (embed) =>
                  embed.$type === "app.bsky.embed.images#view" ||
                  embed.$type === "app.bsky.embed.external#view" ||
                  embed.$type === "app.bsky.embed.record#view" ||
                  embed.$type === "app.bsky.embed.recordWithMedia#view"
              ))
          );
        })
        .map((item) => item.post);

      // Deduplicate posts by URI to prevent duplicate keys
      const uniqueMediaPosts = mediaPosts.filter(
        (post, index, self) =>
          index === self.findIndex((p) => p.uri === post.uri)
      );

      return uniqueMediaPosts;
    },
    enabled: enabled && !!identifier,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
