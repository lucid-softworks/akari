import { useMutation, useQueryClient } from '@tanstack/react-query';

import { BlueskyApi } from '@/bluesky-api';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { draftsQueryKey } from '@/hooks/queries/useDrafts';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import {
  composerStateToDraft,
  type ComposerDraftState,
  type DraftAttachedImage,
} from '@/utils/draftMapper';
import type { PostControls } from '@/utils/postControls';

type DraftPayload = {
  text: string;
  images: DraftAttachedImage[];
  controls: PostControls;
};

function useApi() {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();
  const ready = !!token && !!currentAccount?.pdsUrl;
  return {
    ready,
    token,
    did: currentAccount?.did,
    api: ready && currentAccount?.pdsUrl ? new BlueskyApi(currentAccount.pdsUrl) : null,
  };
}

/**
 * Creates a brand-new server-side draft. May reject with `errorCode ===
 * 'DraftLimitReached'` — callers should surface a "delete one first" toast
 * when that happens.
 */
export function useCreateDraft() {
  const queryClient = useQueryClient();
  const { token, api, did } = useApi();
  return useMutation<ComposerDraftState, Error, DraftPayload>({
    mutationFn: async (payload) => {
      if (!token || !api) throw new Error('Not authenticated');
      const draft = composerStateToDraft(payload);
      const res = await api.createDraft(token, draft);
      const now = new Date().toISOString();
      return {
        id: res.id,
        text: payload.text,
        images: payload.images,
        controls: payload.controls,
        createdAt: now,
        updatedAt: now,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: draftsQueryKey(did) });
    },
  });
}

export function useUpdateDraft() {
  const queryClient = useQueryClient();
  const { token, api, did } = useApi();
  return useMutation<void, Error, { id: string } & DraftPayload>({
    mutationFn: async ({ id, ...payload }) => {
      if (!token || !api) throw new Error('Not authenticated');
      const draft = composerStateToDraft(payload);
      await api.updateDraft(token, id, draft);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: draftsQueryKey(did) });
    },
  });
}

export function useDeleteDraft() {
  const queryClient = useQueryClient();
  const { token, api, did } = useApi();
  return useMutation<void, Error, { id: string }>({
    mutationFn: async ({ id }) => {
      if (!token || !api) throw new Error('Not authenticated');
      await api.deleteDraft(token, id);
    },
    onMutate: async ({ id }) => {
      // Optimistic removal so the drafts sheet feels instant.
      await queryClient.cancelQueries({ queryKey: draftsQueryKey(did) });
      const prev = queryClient.getQueryData<ComposerDraftState[]>(draftsQueryKey(did));
      if (prev) {
        queryClient.setQueryData<ComposerDraftState[]>(
          draftsQueryKey(did),
          prev.filter((d) => d.id !== id),
        );
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      const snapshot = (ctx as { prev?: ComposerDraftState[] } | undefined)?.prev;
      if (snapshot) queryClient.setQueryData(draftsQueryKey(did), snapshot);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: draftsQueryKey(did) });
    },
  });
}
