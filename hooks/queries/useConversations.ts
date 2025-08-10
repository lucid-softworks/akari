import { useInfiniteQuery } from '@tanstack/react-query';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { BlueskyApi } from '@/utils/blueskyApi';

type ConversationError = {
  type: 'permission' | 'network' | 'unknown';
  message: string;
};

/**
 * Infinite query hook for fetching conversations with pagination
 * @param limit - Number of conversations to fetch per page (1-100, default: 50)
 * @param readState - Filter by read state ("unread")
 * @param status - Filter by status ("request" or "accepted")
 * @param enabled - Whether the query should be enabled (default: true)
 */
export function useConversations(
  limit: number = 50,
  readState?: 'unread',
  status?: 'request' | 'accepted',
  enabled: boolean = true,
) {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();
  const currentUserDid = currentAccount?.did;

  return useInfiniteQuery({
    queryKey: ['conversations', limit, readState, status, currentUserDid],
    queryFn: async ({ pageParam }) => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');

      try {
        const api = new BlueskyApi(currentAccount.pdsUrl);
        const response = await api.listConversations(
          token,
          limit,
          pageParam, // cursor
          readState,
          status,
        );

        // Transform the data to match our UI needs
        const conversations = response.convos.map((convo) => {
          // Find the other member (not the current user)
          const otherMember = convo.members.find((member) => member.did !== currentAccount?.did);

          if (!otherMember) {
            throw new Error('No other member found in conversation');
          }

          return {
            id: convo.id,
            convoId: convo.id, // Keep the conversation ID for message fetching
            handle: otherMember.handle,
            displayName: otherMember.displayName || otherMember.handle,
            avatar: otherMember.avatar,
            lastMessage: convo.lastMessage?.text || 'No messages yet',
            timestamp: convo.lastMessage?.sentAt ? new Date(convo.lastMessage.sentAt).toLocaleDateString() : 'No messages',
            unreadCount: convo.unreadCount,
            status: convo.status,
            muted: convo.muted,
          };
        });

        return {
          conversations,
          cursor: response.cursor,
        };
      } catch (error: unknown) {
        // Determine the type of error
        let errorType: ConversationError['type'] = 'unknown';
        let errorMessage = 'Failed to load conversations';

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

        const conversationError: ConversationError = {
          type: errorType,
          message: errorMessage,
        };

        throw conversationError;
      }
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.cursor,
    enabled: enabled && !!token && !!currentUserDid,
    staleTime: 30 * 1000, // 30 seconds
    retry: (failureCount, error: ConversationError) => {
      // Don't retry permission errors
      if (error?.type === 'permission') {
        return false;
      }
      // Retry network errors up to 3 times
      return failureCount < 3;
    },
  });
}
