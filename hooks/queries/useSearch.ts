import { blueskyApi } from "@/utils/blueskyApi";
import { jwtStorage } from "@/utils/secureStorage";
import { useInfiniteQuery } from "@tanstack/react-query";

type SearchTabType = "all" | "users" | "posts";

type SearchResult = {
  type: "profile" | "post";
  data: any;
};

type SearchError = {
  type: "network" | "permission" | "unknown";
  message: string;
};

/**
 * Infinite query hook for search functionality
 * @param query - Search query string
 * @param activeTab - Currently active tab (all, users, posts)
 * @param limit - Number of results per page (default: 20)
 * @param enabled - Whether the query should be enabled (default: true)
 */
export function useSearch(
  query: string,
  activeTab: SearchTabType = "all",
  limit: number = 20,
  enabled: boolean = true
) {
  return useInfiniteQuery({
    queryKey: ["search", query, activeTab, limit],
    queryFn: async ({ pageParam }: { pageParam: string | undefined }) => {
      const token = jwtStorage.getToken();
      if (!token) throw new Error("No access token");

      try {
        // Check if this is a "from:handle" search
        const fromMatch = query.match(/^from:(\S+)/);
        if (fromMatch) {
          // For "from:handle" searches, only search posts
          const postResults = await blueskyApi.searchPosts(
            token,
            query,
            limit,
            pageParam
          );

          const results: SearchResult[] = (postResults.posts || []).map(
            (post: any) => ({
              type: "post" as const,
              data: post,
            })
          );

          return {
            results,
            cursor: postResults.cursor,
          };
        }

        // Regular search based on active tab
        if (activeTab === "users") {
          const profileResults = await blueskyApi.searchProfiles(
            token,
            query,
            limit,
            pageParam
          );

          const results: SearchResult[] = (profileResults.actors || []).map(
            (profile: any) => ({
              type: "profile" as const,
              data: profile,
            })
          );

          return {
            results,
            cursor: profileResults.cursor,
          };
        } else if (activeTab === "posts") {
          const postResults = await blueskyApi.searchPosts(
            token,
            query,
            limit,
            pageParam
          );

          const results: SearchResult[] = (postResults.posts || []).map(
            (post: any) => ({
              type: "post" as const,
              data: post,
            })
          );

          return {
            results,
            cursor: postResults.cursor,
          };
        } else if (activeTab === "all") {
          // For "all" tab, combine both searches
          const [profileResults, postResults] = await Promise.all([
            blueskyApi.searchProfiles(token, query, limit, pageParam),
            blueskyApi.searchPosts(token, query, limit, pageParam),
          ]);

          const results: SearchResult[] = [
            ...(profileResults.actors || []).map((profile: any) => ({
              type: "profile" as const,
              data: profile,
            })),
            ...(postResults.posts || []).map((post: any) => ({
              type: "post" as const,
              data: post,
            })),
          ];

          // Return the cursor from whichever search has more results
          const cursor = profileResults.cursor || postResults.cursor;

          return {
            results,
            cursor,
          };
        }

        return {
          results: [],
          cursor: undefined,
        };
      } catch (error: any) {
        // Determine the type of error
        let errorType: SearchError["type"] = "unknown";
        let errorMessage = "Failed to search";

        if (error?.response?.status === 401) {
          errorType = "permission";
          errorMessage = "Authentication failed. Please sign in again.";
        } else if (error?.response?.status === 403) {
          errorType = "permission";
          errorMessage = "Access to search is not allowed";
        } else if (
          error?.message?.includes("network") ||
          error?.code === "NETWORK_ERROR"
        ) {
          errorType = "network";
          errorMessage =
            "Network error. Please check your connection and try again";
        } else if (error?.response?.status >= 500) {
          errorType = "network";
          errorMessage = "Server error. Please try again later";
        }

        const searchError: SearchError = {
          type: errorType,
          message: errorMessage,
        };

        throw searchError;
      }
    },
    enabled: enabled && !!query.trim() && !!jwtStorage.getToken(),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.cursor,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: (failureCount, error: any) => {
      // Don't retry permission errors
      if (error?.type === "permission") {
        return false;
      }
      // Retry network errors up to 3 times
      return failureCount < 3;
    },
  });
}
