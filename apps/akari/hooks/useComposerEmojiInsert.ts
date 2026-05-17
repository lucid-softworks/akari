import { useCallback } from 'react';

import { insertAtSelection } from '@/utils/postComposer/insertAtSelection';

type UseComposerEmojiInsertOptions = {
  isLongMode: boolean;
  text: string;
  longText: string;
  setText: (next: string) => void;
  setLongText: (next: string) => void;
  textSelectionRef: React.MutableRefObject<{ start: number; end: number }>;
  longTextSelectionRef: React.MutableRefObject<{ start: number; end: number }>;
  onClose: () => void;
};

/**
 * Returns a callback that inserts an emoji at the current text selection
 * (standard vs long mode), then closes the emoji picker.
 */
export function useComposerEmojiInsert({
  isLongMode,
  text,
  longText,
  setText,
  setLongText,
  textSelectionRef,
  longTextSelectionRef,
  onClose,
}: UseComposerEmojiInsertOptions): (emoji: string) => void {
  return useCallback(
    (emoji: string) => {
      if (isLongMode) {
        const { nextText, cursor } = insertAtSelection(
          longText,
          longTextSelectionRef.current,
          emoji,
        );
        setLongText(nextText);
        longTextSelectionRef.current = { start: cursor, end: cursor };
        onClose();
        return;
      }
      const { nextText, cursor } = insertAtSelection(
        text,
        textSelectionRef.current,
        emoji,
      );
      setText(nextText);
      textSelectionRef.current = { start: cursor, end: cursor };
      onClose();
    },
    [
      isLongMode,
      longText,
      text,
      setLongText,
      setText,
      longTextSelectionRef,
      textSelectionRef,
      onClose,
    ],
  );
}
