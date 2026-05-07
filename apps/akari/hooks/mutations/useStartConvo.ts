import { useMutation, useQueryClient } from '@tanstack/react-query';

import { BlueskyApi } from '@/bluesky-api';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';

/**
 * Resolves or creates a conversation for the given member DIDs and returns
 * the convo view (including its `id`). Use the id to navigate into the
 * existing /messages/[handle] route by looking up a member's handle, or
 * later — once the route is migrated — directly via /messages/[convoId].
 *
 * For 1:1 chats pass a single DID. For groups pass every peer's DID — the
 * current user is implicit.
 */
export function useStartConvo() {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ memberDids }: { memberDids: string[] }) => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');
      if (memberDids.length === 0) throw new Error('At least one member is required');

      const api = new BlueskyApi(currentAccount.pdsUrl);
      const result = await api.getConvoForMembers(token, memberDids);
      return result.convo;
    },
    // The /messages/[convoId] route resolves a conversation by looking it up
    // in the cached `useConversations` infinite query — which has a 30s
    // stale window AND filters convos via Bluesky's `listConvos`, so a
    // freshly-created convo with no messages may not appear at all. Trigger
    // a refetch so the route can find the new convo when it mounts.
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}
