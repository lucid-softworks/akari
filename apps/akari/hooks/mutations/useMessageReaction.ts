import { useMutation, useQueryClient } from '@tanstack/react-query';

import { BlueskyApi } from '@/bluesky-api';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';

type ReactionArgs = {
  convoId: string;
  messageId: string;
  value: string;
  action: 'add' | 'remove';
};

type CachedMessage = {
  id: string;
  reactions?: { value: string; sender: { did: string }; createdAt: string }[];
  [key: string]: unknown;
};

type MessagesPage = {
  messages: CachedMessage[];
  cursor?: string;
};

type InfiniteMessagesData = {
  pages: MessagesPage[];
  pageParams: unknown[];
};

/**
 * Adds or removes an emoji reaction on a chat message. Optimistically
 * patches the messages cache so the bubble updates immediately.
 */
export function useMessageReaction() {
  const queryClient = useQueryClient();
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  // The messages query is keyed by ['messages', convoId, limit, currentUserDid].
  // We patch all matching entries (any limit) so all observers update.
  const matchingMessageQueries = (convoId: string) => ({
    predicate: (q: { queryKey: readonly unknown[] }) =>
      q.queryKey[0] === 'messages' && q.queryKey[1] === convoId,
  });

  return useMutation({
    mutationFn: async ({ convoId, messageId, value, action }: ReactionArgs) => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');

      const api = new BlueskyApi(currentAccount.pdsUrl);
      if (action === 'add') {
        return api.addReaction(token, convoId, messageId, value);
      }
      return api.removeReaction(token, convoId, messageId, value);
    },
    onMutate: async ({ convoId, messageId, value, action }) => {
      if (!currentAccount?.did) return;
      await queryClient.cancelQueries(matchingMessageQueries(convoId));

      const senderDid = currentAccount.did;
      const snapshots: Array<{ key: readonly unknown[]; data: InfiniteMessagesData | undefined }> = [];

      queryClient.setQueriesData<InfiniteMessagesData | undefined>(
        matchingMessageQueries(convoId),
        (old) => {
          snapshots.push({ key: [], data: old });
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              messages: page.messages.map((msg) => {
                if (msg.id !== messageId) return msg;
                const reactions = msg.reactions ?? [];
                if (action === 'add') {
                  // Don't double-add if already reacted with this value.
                  if (reactions.some((r) => r.value === value && r.sender.did === senderDid)) {
                    return msg;
                  }
                  return {
                    ...msg,
                    reactions: [
                      ...reactions,
                      { value, sender: { did: senderDid }, createdAt: new Date().toISOString() },
                    ],
                  };
                }
                return {
                  ...msg,
                  reactions: reactions.filter(
                    (r) => !(r.value === value && r.sender.did === senderDid),
                  ),
                };
              }),
            })),
          };
        },
      );

      return { snapshots };
    },
    onError: (_err, { convoId }) => {
      // On failure, refetch to drop our optimistic patch.
      queryClient.invalidateQueries(matchingMessageQueries(convoId));
    },
    onSettled: (_data, _err, { convoId }) => {
      // Don't aggressively refetch on success — the optimistic update is
      // already in place. A background revalidate can happen on the next
      // staleTime tick.
      if (_err) {
        queryClient.invalidateQueries(matchingMessageQueries(convoId));
      }
    },
  });
}
