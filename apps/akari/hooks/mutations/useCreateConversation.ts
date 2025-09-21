import { useMutation, useQueryClient } from '@tanstack/react-query';

import { BlueskyApi, type BlueskyConvo } from '@/bluesky-api';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';

type CreateConversationVariables = {
  did: string;
};

export type CreateConversationError = {
  type: 'permission' | 'network' | 'unknown';
  message: string;
};

export function useCreateConversation() {
  const queryClient = useQueryClient();
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useMutation({
    mutationKey: ['createConversation'],
    mutationFn: async ({ did }: CreateConversationVariables): Promise<BlueskyConvo> => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.did) throw new Error('No user DID available');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');

      const api = new BlueskyApi(currentAccount.pdsUrl);

      try {
        const response = await api.getConversationForMembers(token, [currentAccount.did, did]);
        return response.convo;
      } catch (error: unknown) {
        let errorType: CreateConversationError['type'] = 'unknown';
        let errorMessage = 'Failed to start chat';

        const errorObj = error as { message?: string } | CreateConversationError;

        if ('type' in (errorObj ?? {}) && 'message' in (errorObj ?? {})) {
          throw errorObj as CreateConversationError;
        }

        const message = errorObj?.message ?? '';

        if (message.includes('401') || message.toLowerCase().includes('unauthorized')) {
          errorType = 'permission';
          errorMessage = "Your app password doesn't have permission to start chats";
        } else if (message.includes('403') || message.toLowerCase().includes('forbidden')) {
          errorType = 'permission';
          errorMessage = 'Access to chats is not allowed with this app password';
        } else if (message.toLowerCase().includes('network')) {
          errorType = 'network';
          errorMessage = 'Network error. Please check your connection and try again';
        }

        const createError: CreateConversationError = {
          type: errorType,
          message: errorMessage,
        };

        throw createError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}
