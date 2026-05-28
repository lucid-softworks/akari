import { useCallback, useMemo, useState } from 'react';

/**
 * Owns the open/closed state for the composer's secondary sheets and pickers
 * (GIF, emoji, post controls, drafts, languages) along with stable open/close
 * handlers for each. Extracted from PostComposer; behavior is unchanged.
 */
export function useComposerSheets() {
  const [gifPickerVisible, setGifPickerVisible] = useState(false);
  const [emojiPickerVisible, setEmojiPickerVisible] = useState(false);
  const [controlsSheetVisible, setControlsSheetVisible] = useState(false);
  const [draftsSheetVisible, setDraftsSheetVisible] = useState(false);
  const [languagesSheetVisible, setLanguagesSheetVisible] = useState(false);

  const openGifPicker = useCallback(() => setGifPickerVisible(true), []);
  const closeGifPicker = useCallback(() => setGifPickerVisible(false), []);
  const openEmojiPicker = useCallback(() => setEmojiPickerVisible(true), []);
  const closeEmojiPicker = useCallback(() => setEmojiPickerVisible(false), []);
  const openControlsSheet = useCallback(() => setControlsSheetVisible(true), []);
  const closeControlsSheet = useCallback(() => setControlsSheetVisible(false), []);
  const openDraftsSheet = useCallback(() => setDraftsSheetVisible(true), []);
  const closeDraftsSheet = useCallback(() => setDraftsSheetVisible(false), []);
  const openLanguagesSheet = useCallback(() => setLanguagesSheetVisible(true), []);
  const closeLanguagesSheet = useCallback(() => setLanguagesSheetVisible(false), []);

  return useMemo(
    () => ({
      gifPickerVisible,
      emojiPickerVisible,
      controlsSheetVisible,
      draftsSheetVisible,
      languagesSheetVisible,
      setGifPickerVisible,
      setDraftsSheetVisible,
      openGifPicker,
      closeGifPicker,
      openEmojiPicker,
      closeEmojiPicker,
      openControlsSheet,
      closeControlsSheet,
      openDraftsSheet,
      closeDraftsSheet,
      openLanguagesSheet,
      closeLanguagesSheet,
    }),
    [
      gifPickerVisible,
      emojiPickerVisible,
      controlsSheetVisible,
      draftsSheetVisible,
      languagesSheetVisible,
      openGifPicker,
      closeGifPicker,
      openEmojiPicker,
      closeEmojiPicker,
      openControlsSheet,
      closeControlsSheet,
      openDraftsSheet,
      closeDraftsSheet,
      openLanguagesSheet,
      closeLanguagesSheet,
    ],
  );
}
