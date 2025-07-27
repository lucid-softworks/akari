import { secureStorageUtils } from "@/utils/secureStorage";
import { useEffect, useState } from "react";

/**
 * Custom hook to manage the selected feed with persistence
 * @param defaultFeedUri - The default feed URI to use if no feed is selected
 * @returns Object containing selectedFeed and setSelectedFeed
 */
export function useSelectedFeed(defaultFeedUri: string) {
  const [selectedFeed, setSelectedFeedState] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load the saved feed selection on mount
  useEffect(() => {
    const savedFeed = secureStorageUtils.get("SELECTED_FEED");
    if (savedFeed) {
      setSelectedFeedState(savedFeed);
    } else {
      // Default to the first feed if none is selected
      setSelectedFeedState(defaultFeedUri);
    }
    setIsInitialized(true);
  }, [defaultFeedUri]);

  // Function to update the selected feed and save it
  const setSelectedFeed = (feedUri: string) => {
    setSelectedFeedState(feedUri);
    secureStorageUtils.set("SELECTED_FEED", feedUri);
  };

  return {
    selectedFeed: isInitialized ? selectedFeed : null,
    setSelectedFeed,
    isInitialized,
  };
}
