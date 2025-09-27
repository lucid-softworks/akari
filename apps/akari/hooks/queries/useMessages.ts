import { useInfiniteQuery } from '@tanstack/react-query';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { BlueskyApi } from '@/bluesky-api';
import { useAuthenticatedBluesky } from '@/hooks/useAuthenticatedBluesky';

type MessageError = {
  type: 'permission' | 'network' | 'unknown';
  message: string;
};

/**
 * Infinite query hook for fetching messages in a conversation
 * @param convoId - The conversation ID
 * @param limit - Number of messages to fetch per page (1-100, default: 50)
 */
export function useMessages(convoId: string | undefined, limit: number = 50) {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();
  const apiOptions = useAuthenticatedBluesky();
  const currentUserDid = currentAccount?.did;

  return useInfiniteQuery({
    queryKey: ['messages', convoId, limit, currentUserDid],
    queryFn: async ({ pageParam }) => {
      if (!token) throw new Error('No access token');
      if (!convoId) throw new Error('No conversation ID provided');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');

      try {
        const api = new BlueskyApi(currentAccount.pdsUrl, apiOptions);
        const response = await api.getMessages(
          token,
          convoId,
          limit,
          pageParam, // cursor
        );

        // Transform the data to match our UI needs
        const messages = response.messages.map((message) => {
          const isFromMe = message.sender.did === currentAccount?.did;

          return {
            id: message.id,
            text: message.text || '',
            timestamp: new Date(message.sentAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            }),
            isFromMe,
            sentAt: message.sentAt,
            embed: message.embed,
          };
        });

        return {
          messages,
          cursor: response.cursor,
        };
      } catch (error: unknown) {
        // Determine the type of error
        let errorType: MessageError['type'] = 'unknown';
        let errorMessage = 'Failed to load messages';

        const errorObj = error as {
          response?: { status?: number };
          message?: string;
          code?: string;
        };

        if (errorObj?.response?.status === 401) {
          errorType = 'permission';
          errorMessage = "Your app password doesn't have permission to access messages";
        } else if (errorObj?.response?.status === 403) {
          errorType = 'permission';
          errorMessage = 'Access to messages is not allowed with this app password';
        } else if (errorObj?.message?.includes('Bad token scope')) {
          errorType = 'permission';
          errorMessage =
            "Your app password doesn't have chat permissions. Please create a new app password with chat access in your Bluesky settings.";
        } else if (errorObj?.message?.includes('network') || errorObj?.code === 'NETWORK_ERROR') {
          errorType = 'network';
          errorMessage = 'Network error. Please check your connection and try again';
        } else if (errorObj?.response?.status && errorObj.response.status >= 500) {
          errorType = 'network';
          errorMessage = 'Server error. Please try again later';
        }

        const messageError: MessageError = {
          type: errorType,
          message: errorMessage,
        };

        throw messageError;
      }
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.cursor,
    enabled: !!token && !!convoId && !!currentUserDid,
    staleTime: 30 * 1000, // 30 seconds
    retry: (failureCount, error: MessageError) => {
      // Don't retry permission errors
      if (error?.type === 'permission') {
        return false;
      }
      // Retry network errors up to 3 times
      return failureCount < 3;
    },
  });
}
