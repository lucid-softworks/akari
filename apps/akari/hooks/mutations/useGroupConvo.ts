import { useMutation, useQueryClient } from '@tanstack/react-query';

import { BlueskyApi } from '@/bluesky-api';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';

const invalidateConvoQueries = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: ['conversations'] });
  queryClient.invalidateQueries({ queryKey: ['messages'] });
};

/**
 * Adds members to a group conversation.
 */
export function useAddConvoMembers() {
  const queryClient = useQueryClient();
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useMutation({
    mutationFn: async ({ convoId, dids }: { convoId: string; dids: string[] }) => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');
      const api = new BlueskyApi(currentAccount.pdsUrl);
      return api.addConvoMembers(token, convoId, dids);
    },
    onSuccess: () => invalidateConvoQueries(queryClient),
  });
}

/**
 * Removes members from a group conversation.
 */
export function useRemoveConvoMembers() {
  const queryClient = useQueryClient();
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useMutation({
    mutationFn: async ({ convoId, dids }: { convoId: string; dids: string[] }) => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');
      const api = new BlueskyApi(currentAccount.pdsUrl);
      return api.removeConvoMembers(token, convoId, dids);
    },
    onSuccess: () => invalidateConvoQueries(queryClient),
  });
}

/**
 * Renames a group conversation.
 */
export function useUpdateConvoName() {
  const queryClient = useQueryClient();
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useMutation({
    mutationFn: async ({ convoId, name }: { convoId: string; name: string }) => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');
      const api = new BlueskyApi(currentAccount.pdsUrl);
      return api.updateConvoName(token, convoId, name);
    },
    onSuccess: () => invalidateConvoQueries(queryClient),
  });
}

/**
 * Mutes or unmutes a conversation.
 */
export function useMuteConvo() {
  const queryClient = useQueryClient();
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useMutation({
    mutationFn: async ({ convoId, action }: { convoId: string; action: 'mute' | 'unmute' }) => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');
      const api = new BlueskyApi(currentAccount.pdsUrl);
      return action === 'mute'
        ? api.muteConvo(token, convoId)
        : api.unmuteConvo(token, convoId);
    },
    onSuccess: () => invalidateConvoQueries(queryClient),
  });
}

/**
 * Leaves a conversation. After success, callers should pop the screen since
 * the convo is no longer accessible to the current user.
 */
export function useLeaveConvo() {
  const queryClient = useQueryClient();
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useMutation({
    mutationFn: async ({ convoId }: { convoId: string }) => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');
      const api = new BlueskyApi(currentAccount.pdsUrl);
      return api.leaveConvo(token, convoId);
    },
    onSuccess: () => invalidateConvoQueries(queryClient),
  });
}
