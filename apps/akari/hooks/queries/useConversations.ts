import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { queryKeys } from '@/hooks/queryKeys';
import { useAppViewEnabled } from '@/hooks/useAppViewEnabled';
import { readAppViewEnabled } from '@/hooks/useAppViewSettings';
import { AppViewRequiredError, isAppViewRequiredError } from '@/utils/appView';
import { apiForAccount } from '@/utils/blueskyApi';
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
  const appViewEnabled = useAppViewEnabled();

  return useInfiniteQuery({
    queryKey: queryKeys.conversations.list({ limit, readState, status, did: currentUserDid, appViewEnabled }),
    queryFn: async ({ pageParam }) => {
      if (!readAppViewEnabled()) throw new AppViewRequiredError('conversations');
      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');

      try {
        const api = apiForAccount(currentAccount);
        const response = await api.listConversations(
          token,
          limit,
          pageParam, // cursor
          readState,
          status,
        );

        // Transform the data to match our UI needs
        const conversations = response.convos.map((convo) => {
          // Other members = everyone except the current user. For 1:1 chats
          // that's a single peer; for groups (when the feature flag flips
          // on) it's the full peer list.
          const otherMembers = convo.members.filter((member) => member.did !== currentAccount?.did);

          if (otherMembers.length === 0) {
            throw new Error('No other member found in conversation');
          }

          // Keep `handle`/`displayName`/`avatar` pointing at the first peer
          // for backward compatibility with the existing 1:1 UI; groups
          // pull from `members` directly.
          const primary = otherMembers[0];

          return {
            id: convo.id,
            convoId: convo.id, // Keep the conversation ID for message fetching
            handle: primary.handle,
            displayName: primary.displayName || primary.handle,
            avatar: primary.avatar,
            verification: primary.verification,
            members: otherMembers,
            isGroup: otherMembers.length > 1,
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
    // Keep showing the existing list during background refetch / when the
    // query key transiently changes (e.g. token/currentUserDid flickers on
    // remount), so we don't flash a skeleton on every back-nav.
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000, // 30 seconds
    retry: (failureCount, error: ConversationError | Error) => {
      if (isAppViewRequiredError(error)) return false;
      if ((error as ConversationError)?.type === 'permission') {
        return false;
      }
      return failureCount < 3;
    },
  });
}
