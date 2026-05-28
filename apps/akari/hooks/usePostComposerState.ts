import { useCallback, useMemo, useRef, useState } from 'react';

import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useComposerColors } from '@/hooks/useComposerColors';
import { useComposerDraft } from '@/hooks/useComposerDraft';
import { useComposerDraftHandlers } from '@/hooks/useComposerDraftHandlers';
import { useComposerEmojiInsert } from '@/hooks/useComposerEmojiInsert';
import { useComposerLifecycle } from '@/hooks/useComposerLifecycle';
import { useComposerMediaButtons } from '@/hooks/useComposerMediaButtons';
import { useComposerMediaPicker } from '@/hooks/useComposerMediaPicker';
import { useComposerPoll } from '@/hooks/useComposerPoll';
import { useComposerPublish } from '@/hooks/useComposerPublish';
import { useComposerResetOnOpen } from '@/hooks/useComposerResetOnOpen';
import { useComposerSendability } from '@/hooks/useComposerSendability';
import { useComposerSheets } from '@/hooks/useComposerSheets';
import { useComposerSwitchMode } from '@/hooks/useComposerSwitchMode';
import { useComposerVideoUpload } from '@/hooks/useComposerVideoUpload';
import { usePostLanguages } from '@/hooks/usePostLanguages';
import { useThreadPosts } from '@/hooks/useThreadPosts';
import { getLanguageLabel } from '@/utils/bcp47';
import { MAX_POST_CHARACTERS, type AttachedImage, type ComposeMode } from '@/utils/postComposer/types';
import { DEFAULT_POST_CONTROLS, type PostControls } from '@/utils/postControls';
import { splitForThread } from '@/utils/threadSplitter';

type UsePostComposerStateParams = {
  visible: boolean;
  onClose: () => void;
  replyTo?: {
    root: string;
    parent: string;
    authorHandle: string;
    preview?: import('@/utils/postComposer/types').PostPreview;
  };
  quote?: import('@/utils/postComposer/types').QuotedPost;
};

/**
 * Orchestrates all of the composer's state, derived values, and handlers.
 * Extracted from PostComposer so the component itself stays a thin render of
 * the composer chrome. The returned values map one-for-one onto the props the
 * sub-components received before; behavior is unchanged.
 */
export function usePostComposerState({ visible, onClose, replyTo, quote }: UsePostComposerStateParams) {
  const thread = useThreadPosts();
  const { posts, setPosts, activeIndex, setActiveIndex, activePost, textSelectionRef } = thread;
  const { resetPosts, setAttachedImages, setText, applyVideoPatch, setVideoUploadPhase } = thread;
  const text = activePost.text;
  const [composeMode, setComposeMode] = useState<ComposeMode>('standard');
  const [longText, setLongText] = useState('');
  const [longTitle, setLongTitle] = useState('');
  const longTextSelectionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });
  const [postControls, setPostControls] = useState<PostControls>(DEFAULT_POST_CONTROLS);
  const sheets = useComposerSheets();
  const isLongMode = composeMode !== 'standard';

  // Poll gating: a poll uses the post's external-embed slot, so it's
  // mutually exclusive with media / quote and only allowed in standard mode.
  const { poll, setPoll, togglePoll, pollDisabled, hasValidPoll, pollIncomplete } = useComposerPoll({
    visible,
    pollDisabled:
      !!quote || activePost.attachedImages.length > 0 || !!activePost.attachedVideo || isLongMode,
  });

  const { data: currentAccount } = useCurrentAccount();
  const did = currentAccount?.did;

  const { langs: postLangs, setLangs: setPostLangs } = usePostLanguages();
  const { currentLocale } = useLanguage();
  const postLangsLabel = postLangs.map((tag) => getLanguageLabel(tag, currentLocale)).join(', ');

  // Drafts only apply to plain new posts in standard mode.
  const draftsApply = !replyTo && !quote && composeMode === 'standard';

  const {
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
  } = useComposerDraft({ visible, draftsApply, did, posts, postControls });

  useComposerResetOnOpen({
    visible,
    resetDraftState,
    resetPosts,
    setComposeMode,
    setLongText,
    setLongTitle,
    longTextSelectionRef,
    markHydrated,
    markUnhydrated,
  });

  const { backgroundColor, textColor, borderColor, iconColor, tintColor } = useComposerColors();

  const autoThreadChunks = useMemo(() => {
    if (composeMode !== 'autothread') return [] as string[];
    return splitForThread(longText, MAX_POST_CHARACTERS);
  }, [composeMode, longText]);

  const { resetAfterPublish, resetAndClose } = useComposerLifecycle({
    resetPosts,
    setLongText,
    setLongTitle,
    setComposeMode,
    setPostControls,
    setCurrentDraftId,
    draftIdRef,
    setGifPickerVisible: sheets.setGifPickerVisible,
    onClose,
  });

  const { handlePublish, isPosting, isPublishingLongform } = useComposerPublish({
    composeMode,
    posts,
    longText,
    longTitle,
    postLangs,
    postControls,
    replyTo,
    quote,
    poll,
    currentDraftId,
    deleteDraft,
    onResetAfterPublish: resetAfterPublish,
    onClose,
  });

  const { handleSelectDraft, handleDeleteDraft, handleClose } = useComposerDraftHandlers({
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
    setDraftsSheetVisible: sheets.setDraftsSheetVisible,
    deleteDraft,
    runSave,
    resetAndClose,
  });

  const { startVideoUpload } = useComposerVideoUpload({
    applyVideoPatch,
    setVideoUploadPhase,
  });

  const { handleAddImage, handleAddVideo } = useComposerMediaPicker({
    activeIndex,
    setAttachedImages,
    setPosts,
    startVideoUpload,
  });

  const switchMode = useComposerSwitchMode({
    composeMode,
    posts,
    longText,
    setPosts,
    setActiveIndex,
    setLongText,
    setComposeMode,
  });

  const handleInsertEmoji = useComposerEmojiInsert({
    isLongMode,
    text,
    longText,
    setText,
    setLongText,
    textSelectionRef,
    longTextSelectionRef,
    onClose: sheets.closeEmojiPicker,
  });

  const handleSelectGif = useCallback(
    (gif: AttachedImage) => {
      setAttachedImages((prev) => (prev.length < 4 ? [...prev, gif] : prev));
    },
    [setAttachedImages],
  );

  const handleSaveControls = useCallback(
    (next: PostControls) => {
      setPostControls(next);
      sheets.closeControlsSheet();
    },
    [sheets],
  );

  const handleOpenDrafts = useCallback(() => {
    draftsQuery.refetch();
    sheets.openDraftsSheet();
  }, [draftsQuery, sheets]);

  const { isPostDisabled } = useComposerSendability({
    composeMode,
    posts,
    longText,
    longTitle,
    quote,
    isPosting,
    isPublishingLongform,
  });

  const { photoDisabled, videoDisabled, gifDisabled } = useComposerMediaButtons({
    composeMode,
    rootPost: posts[0],
    activePostImages: activePost.attachedImages,
    activePostVideo: activePost.attachedVideo,
  });

  // A valid poll makes the post sendable even with empty text; an
  // incomplete poll blocks it.
  const postDisabled = pollIncomplete
    ? true
    : hasValidPoll
      ? isPosting || isPublishingLongform
      : isPostDisabled;

  const previewPost = quote ?? replyTo?.preview;
  const characterCount = isLongMode ? longText.length : text.length;
  const isNearLimit = !isLongMode && text.length > MAX_POST_CHARACTERS * 0.8;
  const isOverLimit = !isLongMode && text.length > MAX_POST_CHARACTERS;

  return {
    thread,
    posts,
    setPosts,
    activeIndex,
    setActiveIndex,
    longTextSelectionRef,
    textSelectionRef,
    composeMode,
    longText,
    longTitle,
    setLongText,
    setLongTitle,
    postControls,
    sheets,
    poll,
    setPoll,
    togglePoll,
    pollDisabled,
    postLangs,
    setPostLangs,
    postLangsLabel,
    drafts,
    backgroundColor,
    textColor,
    borderColor,
    iconColor,
    tintColor,
    autoThreadChunks,
    handlePublish,
    isPosting,
    isPublishingLongform,
    handleSelectDraft,
    handleDeleteDraft,
    handleClose,
    handleAddImage,
    handleAddVideo,
    switchMode,
    handleInsertEmoji,
    handleSelectGif,
    handleSaveControls,
    handleOpenDrafts,
    photoDisabled,
    videoDisabled,
    gifDisabled,
    postDisabled,
    previewPost,
    characterCount,
    isNearLimit,
    isOverLimit,
  };
}
