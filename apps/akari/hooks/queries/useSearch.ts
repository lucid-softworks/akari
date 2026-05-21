import { useJwtToken } from "@/hooks/queries/useJwtToken";
import { useCurrentAccount } from "@/hooks/queries/useCurrentAccount";
import { CursorPageParam } from "@/hooks/queries/types";
import { queryKeys } from '@/hooks/queryKeys';
import { useAppViewEnabled } from '@/hooks/useAppViewEnabled';
import { readAppViewEnabled } from '@/hooks/useAppViewSettings';
import { type BlueskyPostView, type BlueskyProfile } from "@/bluesky-api";
import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import { AppViewRequiredError, isAppViewRequiredError } from '@/utils/appView';
import { apiForAccount, apiForPublicAppView } from '@/utils/blueskyApi';

type SearchTabType = "all" | "users" | "posts";
type SearchSort = "top" | "latest";

type SearchResult = {
  type: "profile" | "post";
  data: BlueskyProfile | BlueskyPostView;
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
 * @param sort - Post result ordering ('top' or 'latest', default: 'top')
 */
export function useSearch(
  query: string | undefined,
  activeTab: SearchTabType = "all",
  limit: number = 20,
  sort: SearchSort = "top"
) {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();
  const appViewEnabled = useAppViewEnabled();

  return useInfiniteQuery({
    queryKey: queryKeys.search({ query, activeTab, limit, sort, pdsUrl: currentAccount?.pdsUrl, appViewEnabled }),
    queryFn: async ({ pageParam }: CursorPageParam) => {
      if (!readAppViewEnabled()) throw new AppViewRequiredError("search");
      if (!query) throw new Error("No query provided");

      // Guest path: the bsky public AppView serves `searchActors`
      // unauthenticated (200) but `searchPosts` is auth-gated (403).
      // For guests we use the public AppView with an empty access
      // token and drop the post-side branch entirely — the actor
      // search still resolves, the "all" tab degrades to users-only,
      // and post / "from:handle" searches return empty until the user
      // signs in. Without this, the failing `searchPosts` rejection
      // bubbles up via `Promise.all` and kills the whole query.
      const useGuestPath = !token || !currentAccount?.pdsUrl;
      const api = useGuestPath ? apiForPublicAppView() : apiForAccount(currentAccount);
      const authToken = useGuestPath ? '' : token;
      const skipPostSearch = useGuestPath;

      try {
        // Check if this is a "from:handle" search
        const fromMatch = query.match(/^from:(\S+)/);
        if (fromMatch) {
          if (skipPostSearch) {
            return { results: [], cursor: undefined };
          }
          // For "from:handle" searches, only search posts
          const postResults = await api.searchPosts(
            authToken,
            query,
            limit,
            pageParam,
            sort
          );

          const results: SearchResult[] = (postResults.posts || []).map(
            (post) => ({
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
          const profileResults = await api.searchProfiles(
            authToken,
            query,
            limit,
            pageParam
          );

          const results: SearchResult[] = (profileResults.actors || []).map(
            (profile) => ({
              type: "profile" as const,
              data: profile,
            })
          );

          return {
            results,
            cursor: profileResults.cursor,
          };
        } else if (activeTab === "posts") {
          if (skipPostSearch) {
            return { results: [], cursor: undefined };
          }
          const postResults = await api.searchPosts(
            authToken,
            query,
            limit,
            pageParam,
            sort
          );

          const results: SearchResult[] = (postResults.posts || []).map(
            (post: BlueskyPostView) => ({
              type: "post" as const,
              data: post,
            })
          );

          return {
            results,
            cursor: postResults.cursor,
          };
        } else if (activeTab === "all") {
          // For "all" tab, combine both searches. For guests, skip the
          // auth-gated `searchPosts` so the actor results still render.
          const [profileResults, postResults] = await Promise.all([
            api.searchProfiles(authToken, query, limit, pageParam),
            skipPostSearch
              ? Promise.resolve({ posts: [] as BlueskyPostView[], cursor: undefined as string | undefined })
              : api.searchPosts(authToken, query, limit, pageParam, sort),
          ]);

          const results: SearchResult[] = [
            ...(profileResults.actors || []).map((profile: BlueskyProfile) => ({
              type: "profile" as const,
              data: profile,
            })),
            ...(postResults.posts || []).map((post: BlueskyPostView) => ({
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
      } catch (error: unknown) {
        // Determine the type of error
        let errorType: SearchError["type"] = "unknown";
        let errorMessage = "Failed to search";

        const errorObj = error as {
          response?: { status?: number };
          message?: string;
          code?: string;
        };

        if (errorObj?.response?.status === 401) {
          errorType = "permission";
          errorMessage = "Authentication failed. Please sign in again.";
        } else if (errorObj?.response?.status === 403) {
          errorType = "permission";
          errorMessage = "Access to search is not allowed";
        } else if (
          errorObj?.message?.includes("network") ||
          errorObj?.code === "NETWORK_ERROR"
        ) {
          errorType = "network";
          errorMessage =
            "Network error. Please check your connection and try again";
        } else if (
          errorObj?.response?.status &&
          errorObj.response.status >= 500
        ) {
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
    enabled: !!query && !!query.trim(),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.cursor,
    placeholderData: keepPreviousData,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: (failureCount, error: SearchError | Error) => {
      if (isAppViewRequiredError(error)) return false;
      if ((error as SearchError)?.type === "permission") {
        return false;
      }
      return failureCount < 3;
    },
  });
}
