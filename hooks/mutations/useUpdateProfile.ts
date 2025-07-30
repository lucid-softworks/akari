import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { blueskyApi } from '@/utils/blueskyApi';

/**
 * Mutation hook for updating user profile information
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { data: token } = useJwtToken();

  return useMutation({
    mutationFn: async ({
      displayName,
      description,
      avatar,
      banner,
    }: {
      displayName?: string;
      description?: string;
      avatar?: string;
      banner?: string;
    }) => {
      if (!token) throw new Error('No access token');

      return await blueskyApi.updateProfile(token, {
        displayName,
        description,
        avatar,
        banner,
      });
    },
    onSuccess: () => {
      // Invalidate profile queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}
