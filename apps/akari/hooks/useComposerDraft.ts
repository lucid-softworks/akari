import { useCallback, useEffect, useRef, useState } from 'react';

import { useToast } from '@/contexts/ToastContext';
import {
  useCreateDraft,
  useDeleteDraft,
  useUpdateDraft,
} from '@/hooks/mutations/useDraftMutations';
import { useDrafts } from '@/hooks/queries/useDrafts';
import { useTranslation } from '@/hooks/useTranslation';
import type { ComposerDraftState } from '@/utils/draftMapper';
import type { PostControls } from '@/utils/postControls';
import type { ThreadPost } from '@/utils/postComposer/types';

type DraftPayload = {
  posts: ThreadPost[];
  controls: PostControls;
};

type UseComposerDraftOptions = {
  visible: boolean;
  draftsApply: boolean;
  did?: string;
  posts: ThreadPost[];
  postControls: PostControls;
};

type UseComposerDraftResult = {
  drafts: ComposerDraftState[];
  draftsQuery: ReturnType<typeof useDrafts>;
  currentDraftId: string | null;
  setCurrentDraftId: (id: string | null) => void;
  draftIdRef: React.MutableRefObject<string | null>;
  runSave: (payload: DraftPayload) => Promise<void>;
  deleteDraft: (id: string) => void;
  resetDraftState: () => void;
  markHydrated: () => void;
  markUnhydrated: () => void;
};

/**
 * Encapsulates server-side draft autosave for the composer.
 *
 * Behavior preserved from the inline version:
 *  - Only autosaves when `currentDraftId` is set (the user explicitly
 *    opened a draft); never silently creates a draft for fresh sessions.
 *  - Serializes writes via a single-flight drain loop; concurrent callers
 *    await the same in-flight save promise.
 *  - On `DraftLimitReached` errors the loop stops and surfaces a toast.
 */
export function useComposerDraft({
  visible,
  draftsApply,
  did,
  posts,
  postControls,
}: UseComposerDraftOptions): UseComposerDraftResult {
  const { t } = useTranslation();
  const { showToast } = useToast();

  const draftsQuery = useDrafts(visible && draftsApply);
  const drafts: ComposerDraftState[] = draftsQuery.data ?? [];
  const createDraftMutation = useCreateDraft();
  const updateDraftMutation = useUpdateDraft();
  const deleteDraftMutation = useDeleteDraft();

  // oxlint-disable-next-line react-doctor/rerender-state-only-in-handlers -- Drives the autosave useEffect's dep array (transitioning null -> id schedules the debounce timer); a plain ref wouldn't re-run the effect.
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);

  const draftIdRef = useRef<string | null>(null);
  useEffect(() => {
    draftIdRef.current = currentDraftId;
  }, [currentDraftId]);

  const savePromiseRef = useRef<Promise<void> | null>(null);
  const pendingPayloadRef = useRef<DraftPayload | null>(null);
  const hydratedRef = useRef(false);

  // Stable mutation refs so `runSave` doesn't change identity between
  // mutation state transitions.
  const createMutateRef = useRef(createDraftMutation.mutateAsync);
  const updateMutateRef = useRef(updateDraftMutation.mutateAsync);
  const deleteMutateRef = useRef(deleteDraftMutation.mutateAsync);
  useEffect(() => {
    createMutateRef.current = createDraftMutation.mutateAsync;
    updateMutateRef.current = updateDraftMutation.mutateAsync;
    deleteMutateRef.current = deleteDraftMutation.mutateAsync;
  });

  const runSave = useCallback(
    (payload: DraftPayload): Promise<void> => {
      pendingPayloadRef.current = payload;
      if (savePromiseRef.current) return savePromiseRef.current;
      const drain = (async () => {
        // Yield once so the outer assignment lands before the finally
        // block runs (see original PostComposer for full context).
        await Promise.resolve();
        try {
          while (pendingPayloadRef.current) {
            const next = pendingPayloadRef.current;
            pendingPayloadRef.current = null;
            const trimmed = next.posts.slice();
            while (
              trimmed.length > 1 &&
              trimmed[trimmed.length - 1].text.trim().length === 0 &&
              trimmed[trimmed.length - 1].attachedImages.length === 0
            ) {
              trimmed.pop();
            }
            const isEmpty =
              trimmed.length === 0 ||
              (trimmed.length === 1 &&
                trimmed[0].text.trim().length === 0 &&
                trimmed[0].attachedImages.length === 0);
            const draftPosts = trimmed.map((p) => ({
              text: p.text,
              images: p.attachedImages,
            }));
            try {
              if (isEmpty) {
                if (!draftIdRef.current) continue;
                const id = draftIdRef.current;
                draftIdRef.current = null;
                setCurrentDraftId(null);
                await deleteMutateRef.current({ id });
              } else if (draftIdRef.current) {
                await updateMutateRef.current({
                  id: draftIdRef.current,
                  posts: draftPosts,
                  controls: next.controls,
                });
              } else {
                const created = await createMutateRef.current({
                  posts: draftPosts,
                  controls: next.controls,
                });
                draftIdRef.current = created.id;
                setCurrentDraftId(created.id);
              }
            } catch (err) {
              const code = (err as { errorCode?: string } | null)?.errorCode;
              if (code === 'DraftLimitReached') {
                showToast({
                  type: 'error',
                  message: t('post.draft.limitReached'),
                });
                pendingPayloadRef.current = null;
                break;
              }
              if (__DEV__) console.warn('Draft save failed', err);
            }
          }
        } finally {
          savePromiseRef.current = null;
        }
      })();
      savePromiseRef.current = drain;
      return drain;
    },
    [showToast, t],
  );

  // Debounced autosave on form changes — only when an existing draft is open.
  useEffect(() => {
    if (!visible || !draftsApply || !did || !hydratedRef.current) return;
    if (!currentDraftId) return;
    const timeout = setTimeout(() => {
      runSave({ posts, controls: postControls });
    }, 800);
    return () => clearTimeout(timeout);
    // oxlint-disable-next-line react-doctor/prefer-use-effect-event -- useEffectEvent is React 19 experimental, not in 19.1 stable runtime.
  }, [visible, draftsApply, did, currentDraftId, posts, postControls, runSave]);

  const deleteDraft = useCallback(
    (id: string) => {
      deleteDraftMutation.mutate({ id });
    },
    [deleteDraftMutation],
  );

  const resetDraftState = useCallback(() => {
    setCurrentDraftId(null);
    draftIdRef.current = null;
    pendingPayloadRef.current = null;
  }, []);

  const markHydrated = useCallback(() => {
    hydratedRef.current = true;
  }, []);

  const markUnhydrated = useCallback(() => {
    hydratedRef.current = false;
    pendingPayloadRef.current = null;
  }, []);

  return {
    drafts,
    draftsQuery,
    currentDraftId,
    setCurrentDraftId,
    draftIdRef,
    runSave,
    deleteDraft,
    resetDraftState,
    markHydrated,
    markUnhydrated,
  };
}
