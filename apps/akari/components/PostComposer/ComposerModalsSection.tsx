import { ComposerModals } from '@/components/PostComposer/ComposerModals';
import type { useComposerSheets } from '@/hooks/useComposerSheets';
import type { ComposerDraftState } from '@/utils/draftMapper';
import type { PostControls } from '@/utils/postControls';
import type { AttachedImage } from '@/utils/postComposer/types';

type ComposerSheets = ReturnType<typeof useComposerSheets>;

type ComposerModalsSectionProps = {
  sheets: ComposerSheets;
  postLangs: string[];
  onChangePostLangs: (next: string[]) => void;
  onSelectGif: (gif: AttachedImage) => void;
  onSelectEmoji: (emoji: string) => void;
  postControls: PostControls;
  onSaveControls: (next: PostControls) => void;
  drafts: ComposerDraftState[];
  onSelectDraft: (draft: ComposerDraftState) => void;
  onDeleteDraft: (draft: ComposerDraftState) => void;
};

/**
 * Wires the composer's secondary sheets/pickers to the {@link useComposerSheets}
 * state. Kept as a thin section component so PostComposer's render stays focused
 * on the primary composer chrome. Behavior matches the previous inline JSX.
 */
export function ComposerModalsSection({
  sheets,
  postLangs,
  onChangePostLangs,
  onSelectGif,
  onSelectEmoji,
  postControls,
  onSaveControls,
  drafts,
  onSelectDraft,
  onDeleteDraft,
}: ComposerModalsSectionProps) {
  return (
    <ComposerModals
      languagesSheetVisible={sheets.languagesSheetVisible}
      onCloseLanguages={sheets.closeLanguagesSheet}
      postLangs={postLangs}
      onChangePostLangs={onChangePostLangs}
      gifPickerVisible={sheets.gifPickerVisible}
      onCloseGifPicker={sheets.closeGifPicker}
      onSelectGif={onSelectGif}
      emojiPickerVisible={sheets.emojiPickerVisible}
      onCloseEmojiPicker={sheets.closeEmojiPicker}
      onSelectEmoji={onSelectEmoji}
      controlsSheetVisible={sheets.controlsSheetVisible}
      postControls={postControls}
      onDismissControls={sheets.closeControlsSheet}
      onSaveControls={onSaveControls}
      draftsSheetVisible={sheets.draftsSheetVisible}
      drafts={drafts}
      onDismissDrafts={sheets.closeDraftsSheet}
      onSelectDraft={onSelectDraft}
      onDeleteDraft={onDeleteDraft}
    />
  );
}
