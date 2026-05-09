import { useQuery } from '@tanstack/react-query';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { queryKeys } from '@/hooks/queryKeys';
import { apiForAccount } from '@/utils/blueskyApi';

/**
 * Fetch a single conversation by id directly via `chat.bsky.convo.getConvo`.
 * Used as a fallback in the convo route when the conversation isn't in the
 * `useConversations` infinite-query cache — most commonly because Bluesky's
 * `listConvos` filters out empty conversations, so a freshly-created convo
 * (started from a profile DM button) won't appear there until it has at
 * least one message.
 *
 * Returns the same shape that `useConversations` transforms its entries
 * into, so the consumer can use either source interchangeably.
 */
export function useConvo(convoId: string | undefined | null) {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();
  const currentUserDid = currentAccount?.did;

  return useQuery({
    queryKey: queryKeys.convo(convoId, currentUserDid),
    queryFn: async () => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');
      if (!convoId) throw new Error('No convoId');

      const api = apiForAccount(currentAccount);
      const { convo } = await api.getConvo(token, convoId);

      const otherMembers = convo.members.filter((m) => m.did !== currentUserDid);
      if (otherMembers.length === 0) {
        throw new Error('No other member found in conversation');
      }
      const primary = otherMembers[0];

      return {
        id: convo.id,
        convoId: convo.id,
        handle: primary.handle,
        displayName: primary.displayName || primary.handle,
        avatar: primary.avatar,
        verification: primary.verification,
        members: otherMembers,
        isGroup: otherMembers.length > 1,
        lastMessage: convo.lastMessage?.text || 'No messages yet',
        timestamp: convo.lastMessage?.sentAt
          ? new Date(convo.lastMessage.sentAt).toLocaleDateString()
          : 'No messages',
        unreadCount: convo.unreadCount,
        status: convo.status,
        muted: convo.muted,
      };
    },
    enabled: !!convoId && !!token && !!currentUserDid,
    staleTime: 30 * 1000,
    retry: 1,
  });
}
