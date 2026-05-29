import { useCallback } from 'react';
import { Alert } from 'react-native';

import { useTranslation } from '@/hooks/useTranslation';
import type { ComposerDraftState } from '@/utils/draftMapper';
import type { PostControls } from '@/utils/postControls';
import {
  EMPTY_THREAD_POST,
  type ThreadPost,
} from '@/utils/postComposer/types';

type UseComposerDraftHandlersOptions = {
  draftsApply: boolean;
  did?: string;
  posts: ThreadPost[];
  longText: string;
  longTitle: string;
  postControls: PostControls;
  currentDraftId: string | null;
  setCurrentDraftId: (id: string | null) => void;
  draftIdRef: React.MutableRefObject<string | null>;
  setPosts: React.Dispatch<React.SetStateAction<ThreadPost[]>>;
  setActiveIndex: React.Dispatch<React.SetStateAction<number>>;
  setPostControls: React.Dispatch<React.SetStateAction<PostControls>>;
  closeDraftsSheet: () => void;
  deleteDraft: (id: string) => void;
  runSave: (payload: { posts: ThreadPost[]; controls: PostControls }) => Promise<void>;
  resetAndClose: () => void;
};

type UseComposerDraftHandlersResult = {
  handleSelectDraft: (draft: ComposerDraftState) => void;
  handleDeleteDraft: (draft: ComposerDraftState) => void;
  handleClose: () => void;
};

export function useComposerDraftHandlers({
  draftsApply,
  did,
  posts,
  longText,
  longTitle,
  postControls,
  currentDraftId,
  setCurrentDraftId,
  draftIdRef,
  setPosts,
  setActiveIndex,
  setPostControls,
  closeDraftsSheet,
  deleteDraft,
  runSave,
  resetAndClose,
}: UseComposerDraftHandlersOptions): UseComposerDraftHandlersResult {
  const { t } = useTranslation();

  const handleSelectDraft = useCallback(
    (draft: ComposerDraftState) => {
      setPosts(
        draft.posts.length > 0
          ? draft.posts.map((p) => ({
              text: p.text,
              attachedImages: p.images,
              attachedVideo: null,
            }))
          : [{ ...EMPTY_THREAD_POST }],
      );
      setActiveIndex(0);
      setPostControls(draft.controls);
      setCurrentDraftId(draft.id);
      draftIdRef.current = draft.id;
      closeDraftsSheet();
    },
    [setPosts, setActiveIndex, setPostControls, setCurrentDraftId, draftIdRef, closeDraftsSheet],
  );

  const handleDeleteDraft = useCallback(
    (draft: ComposerDraftState) => {
      deleteDraft(draft.id);
      if (currentDraftId === draft.id) {
        setCurrentDraftId(null);
        draftIdRef.current = null;
      }
    },
    [deleteDraft, currentDraftId, setCurrentDraftId, draftIdRef],
  );

  const handleClose = useCallback(() => {
    const hasContent =
      longText.trim().length > 0 ||
      longTitle.trim().length > 0 ||
      posts.some(
        (p) =>
          p.text.trim().length > 0 ||
          p.attachedImages.length > 0 ||
          !!p.attachedVideo,
      );
    if (draftsApply && did && hasContent) {
      Alert.alert(t('post.draft.discardTitle'), undefined, [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('post.draft.discard'),
          style: 'destructive',
          onPress: () => {
            if (currentDraftId) deleteDraft(currentDraftId);
            resetAndClose();
          },
        },
        {
          text: t('post.draft.saveDraft'),
          onPress: async () => {
            await runSave({ posts, controls: postControls });
            resetAndClose();
          },
        },
      ]);
      return;
    }
    resetAndClose();
  }, [
    draftsApply,
    did,
    posts,
    longText,
    longTitle,
    postControls,
    currentDraftId,
    deleteDraft,
    runSave,
    t,
    resetAndClose,
  ]);

  return { handleSelectDraft, handleDeleteDraft, handleClose };
}
