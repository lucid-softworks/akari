import { useCallback, useEffect } from 'react';

import type { ComposeMode } from '@/utils/postComposer/types';

type UseComposerResetOnOpenOptions = {
  visible: boolean;
  resetDraftState: () => void;
  resetPosts: () => void;
  setComposeMode: (mode: ComposeMode) => void;
  setLongText: (next: string) => void;
  setLongTitle: (next: string) => void;
  longTextSelectionRef: React.MutableRefObject<{ start: number; end: number }>;
  markHydrated: () => void;
  markUnhydrated: () => void;
};

/**
 * Drives the open / close lifecycle. On open: clears form state, resets the
 * draft id, and marks the autosave hook as hydrated so subsequent edits can
 * trigger debounced saves. On close: marks the autosave loop unhydrated so
 * nothing fires in the background.
 */
export function useComposerResetOnOpen({
  visible,
  resetDraftState,
  resetPosts,
  setComposeMode,
  setLongText,
  setLongTitle,
  longTextSelectionRef,
  markHydrated,
  markUnhydrated,
}: UseComposerResetOnOpenOptions): void {
  const resetForOpen = useCallback(() => {
    resetDraftState();
    resetPosts();
    setComposeMode('standard');
    setLongText('');
    setLongTitle('');
    longTextSelectionRef.current = { start: 0, end: 0 };
    markHydrated();
  }, [
    resetDraftState,
    resetPosts,
    setComposeMode,
    setLongText,
    setLongTitle,
    longTextSelectionRef,
    markHydrated,
  ]);

  useEffect(() => {
    if (!visible) {
      markUnhydrated();
      return;
    }
    resetForOpen();
  }, [visible, resetForOpen, markUnhydrated]);
}
