import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { PollFields } from '@/components/PollFields';
import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { ComposerContent } from '@/components/PostComposer/ComposerContent';
import { ComposerFooter } from '@/components/PostComposer/ComposerFooter';
import { ComposerHeader } from '@/components/PostComposer/ComposerHeader';
import { ComposerModals } from '@/components/PostComposer/ComposerModals';
import { ComposerShell } from '@/components/PostComposer/ComposerShell';
import { ReplyContextBanner } from '@/components/PostComposer/ReplyContextBanner';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useComposerDraft } from '@/hooks/useComposerDraft';
import { useComposerDraftHandlers } from '@/hooks/useComposerDraftHandlers';
import { useComposerEmojiInsert } from '@/hooks/useComposerEmojiInsert';
import { useComposerLifecycle } from '@/hooks/useComposerLifecycle';
import { useComposerMediaButtons } from '@/hooks/useComposerMediaButtons';
import { useComposerMediaPicker } from '@/hooks/useComposerMediaPicker';
import { useComposerPublish } from '@/hooks/useComposerPublish';
import { useComposerResetOnOpen } from '@/hooks/useComposerResetOnOpen';
import { useComposerSendability } from '@/hooks/useComposerSendability';
import { useComposerColors } from '@/hooks/useComposerColors';
import { useComposerSwitchMode } from '@/hooks/useComposerSwitchMode';
import { useComposerVideoUpload } from '@/hooks/useComposerVideoUpload';
import { usePostLanguages } from '@/hooks/usePostLanguages';
import { useThreadPosts } from '@/hooks/useThreadPosts';
import { getLanguageLabel } from '@/utils/bcp47';
import { DEFAULT_POST_CONTROLS, type PostControls } from '@/utils/postControls';
import { splitForThread } from '@/utils/threadSplitter';
import {
  EMPTY_POLL_DRAFT,
  MAX_POST_CHARACTERS,
  MIN_POLL_OPTIONS,
  type AttachedImage,
  type ComposeMode,
  type PollDraft,
  type PostPreview,
  type QuotedPost,
} from '@/utils/postComposer/types';
import { fontSize, fontWeight, hitSlop, spacing } from '@/constants/tokens';
import { useTranslation } from '@/hooks/useTranslation';

type PostComposerProps = {
  visible: boolean;
  onClose: () => void;
  replyTo?: {
    root: string;
    parent: string;
    authorHandle: string;
    /** Optional preview data; renders the parent post above the input. */
    preview?: PostPreview;
  };
  /** Optional quoted post; renders an inline preview and includes
   * `embed.record` (or `embed.recordWithMedia` if images are attached)
   * when the post is published. */
  quote?: QuotedPost;
};

export function PostComposer({ visible, onClose, replyTo, quote }: PostComposerProps) {
  const thread = useThreadPosts();
  const { posts, setPosts, activeIndex, setActiveIndex, activePost, textSelectionRef } = thread;
  const { resetPosts, setAttachedImages, setText, applyVideoPatch, setVideoUploadPhase } = thread;
  const text = activePost.text;
  const [composeMode, setComposeMode] = useState<ComposeMode>('standard');
  const [longText, setLongText] = useState('');
  const [longTitle, setLongTitle] = useState('');
  const longTextSelectionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });
  const [gifPickerVisible, setGifPickerVisible] = useState(false);
  const [emojiPickerVisible, setEmojiPickerVisible] = useState(false);
  const [controlsSheetVisible, setControlsSheetVisible] = useState(false);
  const [postControls, setPostControls] = useState<PostControls>(DEFAULT_POST_CONTROLS);
  const [draftsSheetVisible, setDraftsSheetVisible] = useState(false);
  const [languagesSheetVisible, setLanguagesSheetVisible] = useState(false);
  const [poll, setPoll] = useState<PollDraft | null>(null);

  const { t } = useTranslation();
  // Clear any attached poll when the composer closes so the next open starts
  // fresh (mirrors the other reset-on-open state).
  useEffect(() => {
    if (!visible) setPoll(null);
  }, [visible]);

  const { data: currentAccount } = useCurrentAccount();
  const did = currentAccount?.did;

  const { langs: postLangs, setLangs: setPostLangs } = usePostLanguages();
  const { currentLocale } = useLanguage();
  const postLangsLabel = postLangs
    .map((tag) => getLanguageLabel(tag, currentLocale))
    .join(', ');

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
    setGifPickerVisible,
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
    setDraftsSheetVisible,
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

  const isLongMode = composeMode !== 'standard';

  const handleInsertEmoji = useComposerEmojiInsert({
    isLongMode,
    text,
    longText,
    setText,
    setLongText,
    textSelectionRef,
    longTextSelectionRef,
    onClose: () => setEmojiPickerVisible(false),
  });

  const handleSelectGif = useCallback(
    (gif: AttachedImage) => {
      setAttachedImages((prev) => (prev.length < 4 ? [...prev, gif] : prev));
    },
    [setAttachedImages],
  );

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

  // Poll gating: a poll uses the post's external-embed slot, so it's
  // mutually exclusive with media / quote and only allowed in standard mode.
  const pollDisabled =
    !!quote || activePost.attachedImages.length > 0 || !!activePost.attachedVideo || isLongMode;
  const filledPollOptions = poll ? poll.options.filter((o) => o.trim().length > 0).length : 0;
  const hasValidPoll = !!poll && filledPollOptions >= MIN_POLL_OPTIONS;
  const pollIncomplete = !!poll && !hasValidPoll;
  const togglePoll = useCallback(() => {
    setPoll((prev) => (prev ? null : EMPTY_POLL_DRAFT));
  }, []);

  // A valid poll makes the post sendable even with empty text; an
  // incomplete poll blocks it.
  const postDisabled = pollIncomplete
    ? true
    : hasValidPoll
      ? isPosting || isPublishingLongform
      : isPostDisabled;

  const pollEditor = poll ? (
    <View style={styles.pollSection}>
      <View style={styles.pollHeader}>
        <ThemedText style={[styles.pollTitle, { color: textColor }]}>{t('poll.newPoll')}</ThemedText>
        <Pressable onPress={() => setPoll(null)} hitSlop={hitSlop} accessibilityRole="button" accessibilityLabel={t('common.cancel')}>
          <IconSymbol name="xmark" size={16} color={iconColor} />
        </Pressable>
      </View>
      <PollFields
        options={poll.options}
        onChangeOptions={(options) => setPoll((prev) => (prev ? { ...prev, options } : prev))}
        durationHours={poll.durationHours}
        onChangeDuration={(durationHours) => setPoll((prev) => (prev ? { ...prev, durationHours } : prev))}
      />
    </View>
  ) : null;

  const previewPost: PostPreview | undefined = quote ?? replyTo?.preview;
  const characterCount = isLongMode ? longText.length : text.length;
  const isNearLimit = !isLongMode && text.length > MAX_POST_CHARACTERS * 0.8;
  const isOverLimit = !isLongMode && text.length > MAX_POST_CHARACTERS;

  return (
    <ComposerShell
      visible={visible}
      onRequestClose={handleClose}
      backgroundColor={backgroundColor}
      trailingChildren={
        <ComposerModals
          languagesSheetVisible={languagesSheetVisible}
          onCloseLanguages={() => setLanguagesSheetVisible(false)}
          postLangs={postLangs}
          onChangePostLangs={setPostLangs}
          gifPickerVisible={gifPickerVisible}
          onCloseGifPicker={() => setGifPickerVisible(false)}
          onSelectGif={handleSelectGif}
          emojiPickerVisible={emojiPickerVisible}
          onCloseEmojiPicker={() => setEmojiPickerVisible(false)}
          onSelectEmoji={handleInsertEmoji}
          controlsSheetVisible={controlsSheetVisible}
          postControls={postControls}
          onDismissControls={() => setControlsSheetVisible(false)}
          onSaveControls={(next) => {
            setPostControls(next);
            setControlsSheetVisible(false);
          }}
          draftsSheetVisible={draftsSheetVisible}
          drafts={drafts}
          onDismissDrafts={() => setDraftsSheetVisible(false)}
          onSelectDraft={handleSelectDraft}
          onDeleteDraft={handleDeleteDraft}
        />
      }
    >
      <ComposerHeader
        state={{
          mode: composeMode,
          kind: replyTo ? 'reply' : quote ? 'quote' : 'new',
          pending: isPublishingLongform ? 'publishingLongform' : isPosting ? 'posting' : 'idle',
          postDisabled,
        }}
        borderColor={borderColor}
        textColor={textColor}
        iconColor={iconColor}
        tintColor={tintColor}
        onCancel={handleClose}
        onPost={handlePublish}
      />

      {replyTo ? (
        <ReplyContextBanner
          authorHandle={replyTo.authorHandle}
          borderColor={borderColor}
          textColor={textColor}
          iconColor={iconColor}
          tintColor={tintColor}
        />
      ) : null}

      <ComposerContent
        composeMode={composeMode}
        isReply={!!replyTo}
        isQuote={!!quote}
        previewPost={previewPost}
        drafts={drafts}
        onOpenDrafts={() => {
          draftsQuery.refetch();
          setDraftsSheetVisible(true);
        }}
        onSwitchMode={switchMode}
        longText={longText}
        longTitle={longTitle}
        setLongText={setLongText}
        setLongTitle={setLongTitle}
        onLongTextSelectionChange={(sel) => {
          longTextSelectionRef.current = sel;
        }}
        autoThreadChunks={autoThreadChunks}
        rootImages={posts[0].attachedImages}
        posts={posts}
        activeIndex={activeIndex}
        onChangePostText={(postIdx, next) =>
          setPosts((prev) =>
            prev.map((p, i) => (i === postIdx ? { ...p, text: next } : p)),
          )
        }
        onFocusPost={(postIdx) => setActiveIndex(postIdx)}
        onSelectionChange={(sel) => {
          textSelectionRef.current = sel;
        }}
        onRemovePost={thread.removePost}
        onAddPost={thread.addPost}
        onRemoveImage={thread.removeImage}
        onUpdateImageAlt={thread.updateImageAlt}
        onRemoveVideo={thread.removeVideo}
        onUpdateVideoAlt={thread.updateVideoAlt}
        textColor={textColor}
        iconColor={iconColor}
        borderColor={borderColor}
        backgroundColor={backgroundColor}
        tintColor={tintColor}
        pollEditor={pollEditor}
      />

      <ComposerFooter
        composeMode={composeMode}
        characterCount={characterCount}
        isNearLimit={isNearLimit}
        isOverLimit={isOverLimit}
        autoThreadPartCount={autoThreadChunks.length}
        showControlsButton={!replyTo}
        postControls={postControls}
        postLangs={postLangs}
        postLangsLabel={postLangsLabel}
        photoDisabled={photoDisabled || !!poll}
        videoDisabled={videoDisabled || !!poll}
        gifDisabled={gifDisabled || !!poll}
        pollActive={!!poll}
        pollDisabled={pollDisabled}
        borderColor={borderColor}
        iconColor={iconColor}
        tintColor={tintColor}
        onAddPhoto={handleAddImage}
        onAddVideo={handleAddVideo}
        onTogglePoll={togglePoll}
        onOpenEmoji={() => setEmojiPickerVisible(true)}
        onAddGif={() => setGifPickerVisible(true)}
        onOpenControls={() => setControlsSheetVisible(true)}
        onOpenLanguages={() => setLanguagesSheetVisible(true)}
      />
    </ComposerShell>
  );
}

const styles = StyleSheet.create({
  pollSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  pollHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pollTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
});
