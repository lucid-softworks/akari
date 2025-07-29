import { secureStorageUtils } from "@/utils/secureStorage";
import { useQuery, useQueryClient } from "@tanstack/react-query";

/**
 * Query hook to manage the selected feed with persistence
 * @param defaultFeedUri - The default feed URI to use if no feed is selected
 * @returns Object containing selectedFeed and setSelectedFeed
 */
export function useSelectedFeed(defaultFeedUri: string) {
  const queryClient = useQueryClient();

  const feedQuery = useQuery({
    queryKey: ["selectedFeed"],
    queryFn: () => {
      const savedFeed = secureStorageUtils.get("SELECTED_FEED");
      return savedFeed || defaultFeedUri;
    },
    staleTime: Infinity, // This data doesn't change unless explicitly updated
    gcTime: Infinity, // Keep in cache indefinitely
  });

  const setSelectedFeed = (feedUri: string) => {
    secureStorageUtils.set("SELECTED_FEED", feedUri);
    // Update the query cache immediately
    queryClient.setQueryData(["selectedFeed"], feedUri);
  };

  return {
    selectedFeed: feedQuery.data,
    setSelectedFeed,
    isInitialized: !feedQuery.isLoading,
  };
}