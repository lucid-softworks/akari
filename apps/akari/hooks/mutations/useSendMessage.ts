import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { BlueskyApi } from '@/bluesky-api';

/**
 * Mutation hook for sending messages in conversations
 */
type SendMessageParams = {
  /** The conversation ID */
  convoId: string;
  /** The message text content */
  text: string;
};

export function useSendMessage() {
  const queryClient = useQueryClient();
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useMutation({
    mutationKey: ['sendMessage'],
    mutationFn: async ({ convoId, text }: SendMessageParams) => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.did) throw new Error('No user DID available');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');

      const api = new BlueskyApi(currentAccount.pdsUrl);
      return await api.sendMessage(convoId, { text });
    },
    onMutate: async ({ convoId, text }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['messages', convoId] });

      // Snapshot the previous values
      const previousMessages = queryClient.getQueryData(['messages', convoId]);

      // Create optimistic message data
      const optimisticMessage = {
        id: `temp-${Date.now()}`, // Temporary ID for optimistic update
        rev: `temp-rev-${Date.now()}`, // Temporary revision
        text,
        facets: undefined,
        embed: undefined,
        reactions: [],
        sender: {
          did: currentAccount?.did || '',
        },
        sentAt: new Date().toISOString(),
      };

      // Optimistically update messages
      if (previousMessages) {
        queryClient.setQueryData(['messages', convoId], (old: any) => {
          if (!old?.pages?.[0]?.messages) return old;
          return {
            ...old,
            pages: [
              {
                ...old.pages[0],
                messages: [optimisticMessage, ...old.pages[0].messages],
              },
              ...old.pages.slice(1),
            ],
          };
        });
      }

      // Return context with the snapshotted values
      return {
        previousMessages,
        optimisticMessage,
      };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousMessages) {
        queryClient.setQueryData(['messages', variables.convoId], context.previousMessages);
      }
    },
    onSettled: (data, error, variables) => {
      // Always refetch after error or success to ensure data consistency
      queryClient.invalidateQueries({ queryKey: ['messages', variables.convoId] });
    },
  });
}
