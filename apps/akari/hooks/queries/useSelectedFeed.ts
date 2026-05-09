import { useQuery } from "@tanstack/react-query";

import { queryKeys } from '@/hooks/queryKeys';

/**
 * Query hook to get the selected feed
 */
export function useSelectedFeed() {
  const defaultFeedUri =
    "at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.generator/whats-hot";

  return useQuery({
    queryKey: queryKeys.selectedFeed(),
    queryFn: () => {
      return defaultFeedUri;
    },
    staleTime: Infinity,
    gcTime: Infinity,
    initialData: defaultFeedUri,
    meta: {
      persist: true,
    },
  });
}
