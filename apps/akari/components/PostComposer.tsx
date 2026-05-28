import { ComposerContent } from '@/components/PostComposer/ComposerContent';
import { ComposerFooter } from '@/components/PostComposer/ComposerFooter';
import { ComposerHeader } from '@/components/PostComposer/ComposerHeader';
import { ComposerModalsSection } from '@/components/PostComposer/ComposerModalsSection';
import { ComposerShell } from '@/components/PostComposer/ComposerShell';
import { PollEditor } from '@/components/PostComposer/PollEditor';
import { ReplyContextBanner } from '@/components/PostComposer/ReplyContextBanner';
import { usePostComposerState } from '@/hooks/usePostComposerState';
import type { PostPreview, QuotedPost } from '@/utils/postComposer/types';

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
  const {
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
  } = usePostComposerState({ visible, onClose, replyTo, quote });

  const pollEditor = poll ? (
    <PollEditor poll={poll} onChange={setPoll} textColor={textColor} iconColor={iconColor} />
  ) : null;

  return (
    <ComposerShell
      visible={visible}
      onRequestClose={handleClose}
      backgroundColor={backgroundColor}
      trailingChildren={
        <ComposerModalsSection
          sheets={sheets}
          postLangs={postLangs}
          onChangePostLangs={setPostLangs}
          onSelectGif={handleSelectGif}
          onSelectEmoji={handleInsertEmoji}
          postControls={postControls}
          onSaveControls={handleSaveControls}
          drafts={drafts}
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
        onOpenDrafts={handleOpenDrafts}
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
        onOpenEmoji={sheets.openEmojiPicker}
        onAddGif={sheets.openGifPicker}
        onOpenControls={sheets.openControlsSheet}
        onOpenLanguages={sheets.openLanguagesSheet}
      />
    </ComposerShell>
  );
}
