import { useCallback } from 'react';

import { buildModeSwitch } from '@/utils/postComposer/buildModeSwitch';
import type { ComposeMode, ThreadPost } from '@/utils/postComposer/types';

type UseComposerSwitchModeOptions = {
  composeMode: ComposeMode;
  posts: ThreadPost[];
  longText: string;
  setPosts: React.Dispatch<React.SetStateAction<ThreadPost[]>>;
  setActiveIndex: React.Dispatch<React.SetStateAction<number>>;
  setLongText: React.Dispatch<React.SetStateAction<string>>;
  setComposeMode: (mode: ComposeMode) => void;
};

/**
 * Returns the mode-switch callback that maps state (posts <-> longText)
 * across compose mode transitions while preserving the user's content.
 */
export function useComposerSwitchMode({
  composeMode,
  posts,
  longText,
  setPosts,
  setActiveIndex,
  setLongText,
  setComposeMode,
}: UseComposerSwitchModeOptions): (next: ComposeMode) => void {
  return useCallback(
    (next: ComposeMode) => {
      const result = buildModeSwitch(composeMode, next, posts, longText);
      if (!result) return;
      setPosts(result.nextPosts);
      setActiveIndex(0);
      if (result.nextLongText !== undefined) {
        const fallbackText = result.nextLongText;
        setLongText((prev) => (fallbackText.length > 0 ? fallbackText : prev));
      }
      setComposeMode(next);
    },
    [composeMode, posts, longText, setPosts, setActiveIndex, setLongText, setComposeMode],
  );
}
