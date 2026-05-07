import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { apiForAccount } from '@/utils/blueskyApi';
/**
 * Mutation hook for updating user profile information
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useMutation({
    mutationKey: ['updateProfile'],
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
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');

      const api = apiForAccount(currentAccount);
      return await api.updateProfile(token, {
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
