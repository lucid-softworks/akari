import { storage } from '@/utils/secureStorage';
import { useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * Mutation hook for setting the selected feed
 */
export function useSetSelectedFeed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (feedUri: string) => {
      return feedUri;
    },
    onSuccess: (feedUri) => {
      queryClient.setQueryData(['selectedFeed'], feedUri);

      // Manually persist the updated selected feed query
      storage.setItem('selectedFeed', feedUri);
    },
  });
}
