import { DraftsSheet } from '@/components/DraftsSheet';
import { EmojiPicker } from '@/components/EmojiPicker';
import { GifPicker } from '@/components/GifPicker';
import { PostControlsSheet } from '@/components/PostControlsSheet';
import { PostLanguagesSheet } from '@/components/PostLanguagesSheet';
import type { ComposerDraftState } from '@/utils/draftMapper';
import type { PostControls } from '@/utils/postControls';
import type { AttachedImage } from '@/utils/postComposer/types';

type ComposerModalsProps = {
  // Languages
  languagesSheetVisible: boolean;
  onCloseLanguages: () => void;
  postLangs: string[];
  onChangePostLangs: (next: string[]) => void;
  // GIF
  gifPickerVisible: boolean;
  onCloseGifPicker: () => void;
  onSelectGif: (gif: AttachedImage) => void;
  // Emoji
  emojiPickerVisible: boolean;
  onCloseEmojiPicker: () => void;
  onSelectEmoji: (emoji: string) => void;
  // Controls
  controlsSheetVisible: boolean;
  postControls: PostControls;
  onDismissControls: () => void;
  onSaveControls: (next: PostControls) => void;
  // Drafts
  draftsSheetVisible: boolean;
  drafts: ComposerDraftState[];
  onDismissDrafts: () => void;
  onSelectDraft: (draft: ComposerDraftState) => void;
  onDeleteDraft: (draft: ComposerDraftState) => void;
};

export function ComposerModals({
  languagesSheetVisible,
  onCloseLanguages,
  postLangs,
  onChangePostLangs,
  gifPickerVisible,
  onCloseGifPicker,
  onSelectGif,
  emojiPickerVisible,
  onCloseEmojiPicker,
  onSelectEmoji,
  controlsSheetVisible,
  postControls,
  onDismissControls,
  onSaveControls,
  draftsSheetVisible,
  drafts,
  onDismissDrafts,
  onSelectDraft,
  onDeleteDraft,
}: ComposerModalsProps) {
  return (
    <>
      <PostLanguagesSheet
        visible={languagesSheetVisible}
        onClose={onCloseLanguages}
        selected={postLangs}
        onChange={onChangePostLangs}
      />
      <GifPicker
        visible={gifPickerVisible}
        onClose={onCloseGifPicker}
        onSelectGif={onSelectGif}
      />
      <EmojiPicker
        visible={emojiPickerVisible}
        onClose={onCloseEmojiPicker}
        onSelectEmoji={onSelectEmoji}
      />
      <PostControlsSheet
        visible={controlsSheetVisible}
        initialControls={postControls}
        onDismiss={onDismissControls}
        onSave={onSaveControls}
      />
      <DraftsSheet
        visible={draftsSheetVisible}
        drafts={drafts}
        onDismiss={onDismissDrafts}
        onSelect={onSelectDraft}
        onDelete={onDeleteDraft}
      />
    </>
  );
}
