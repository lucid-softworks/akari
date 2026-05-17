import { useCallback } from 'react';

import { DEFAULT_POST_CONTROLS, type PostControls } from '@/utils/postControls';
import type { ComposeMode } from '@/utils/postComposer/types';

type UseComposerLifecycleOptions = {
  resetPosts: () => void;
  setLongText: (next: string) => void;
  setLongTitle: (next: string) => void;
  setComposeMode: (next: ComposeMode) => void;
  setPostControls: (next: PostControls) => void;
  setCurrentDraftId: (id: string | null) => void;
  draftIdRef: React.MutableRefObject<string | null>;
  setGifPickerVisible: (visible: boolean) => void;
  onClose: () => void;
};

type UseComposerLifecycleResult = {
  resetAfterPublish: () => void;
  resetAndClose: () => void;
};

/**
 * Bundles the two "wipe and exit" routines shared by the publish path and
 * the discard/save-draft close paths.
 */
export function useComposerLifecycle({
  resetPosts,
  setLongText,
  setLongTitle,
  setComposeMode,
  setPostControls,
  setCurrentDraftId,
  draftIdRef,
  setGifPickerVisible,
  onClose,
}: UseComposerLifecycleOptions): UseComposerLifecycleResult {
  const resetAfterPublish = useCallback(() => {
    resetPosts();
    setLongText('');
    setLongTitle('');
    setComposeMode('standard');
    setPostControls(DEFAULT_POST_CONTROLS);
    setCurrentDraftId(null);
    draftIdRef.current = null;
  }, [
    resetPosts,
    setLongText,
    setLongTitle,
    setComposeMode,
    setPostControls,
    setCurrentDraftId,
    draftIdRef,
  ]);

  const resetAndClose = useCallback(() => {
    resetAfterPublish();
    setGifPickerVisible(false);
    onClose();
  }, [resetAfterPublish, setGifPickerVisible, onClose]);

  return { resetAfterPublish, resetAndClose };
}
