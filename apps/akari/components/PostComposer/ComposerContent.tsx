import { Pressable, ScrollView, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useTranslation } from '@/hooks/useTranslation';
import type { ComposerDraftState } from '@/utils/draftMapper';
import type {
  AttachedImage,
  ComposeMode,
  PostPreview,
  ThreadPost,
} from '@/utils/postComposer/types';

import { LongModeInputBlock } from './LongModeInputBlock';
import { ModeChip } from './ModeChip';
import { PostPreviewCard } from './PostPreviewCard';
import { ThreadPostBlock } from './ThreadPostBlock';
import { styles } from './styles';

type ComposerContentProps = {
  composeMode: ComposeMode;
  isReply: boolean;
  isQuote: boolean;
  previewPost?: PostPreview;
  drafts: ComposerDraftState[];
  onOpenDrafts: () => void;
  onSwitchMode: (next: ComposeMode) => void;
  // Long mode
  longText: string;
  longTitle: string;
  setLongText: (next: string) => void;
  setLongTitle: (next: string) => void;
  onLongTextSelectionChange: (selection: { start: number; end: number }) => void;
  autoThreadChunks: string[];
  rootImages: AttachedImage[];
  // Thread mode
  posts: ThreadPost[];
  activeIndex: number;
  onChangePostText: (postIdx: number, next: string) => void;
  onFocusPost: (postIdx: number) => void;
  onSelectionChange: (selection: { start: number; end: number }) => void;
  onRemovePost: (postIdx: number) => void;
  onAddPost: () => void;
  onRemoveImage: (postIdx: number, imageIdx: number) => void;
  onUpdateImageAlt: (postIdx: number, imageIdx: number, alt: string) => void;
  onRemoveVideo: (postIdx: number) => void;
  onUpdateVideoAlt: (postIdx: number, alt: string) => void;
  // Colors
  textColor: string;
  iconColor: string;
  borderColor: string;
  backgroundColor: string;
  tintColor: string;
};

export function ComposerContent({
  composeMode,
  isReply,
  isQuote,
  previewPost,
  drafts,
  onOpenDrafts,
  onSwitchMode,
  longText,
  longTitle,
  setLongText,
  setLongTitle,
  onLongTextSelectionChange,
  autoThreadChunks,
  rootImages,
  posts,
  activeIndex,
  onChangePostText,
  onFocusPost,
  onSelectionChange,
  onRemovePost,
  onAddPost,
  onRemoveImage,
  onUpdateImageAlt,
  onRemoveVideo,
  onUpdateVideoAlt,
  textColor,
  iconColor,
  borderColor,
  backgroundColor,
  tintColor,
}: ComposerContentProps) {
  const { t } = useTranslation();
  const isLongMode = composeMode !== 'standard';

  return (
    <ScrollView style={styles.contentArea} showsVerticalScrollIndicator={false}>
      {isReply && previewPost ? (
        <PostPreviewCard
          post={previewPost}
          borderColor={borderColor}
          textColor={textColor}
          iconColor={iconColor}
        />
      ) : null}

      {composeMode === 'standard' && !isReply && drafts.length > 0 ? (
        <View style={styles.draftsBar}>
          <Pressable
            style={({ pressed }) => [styles.draftsPill, { borderColor }, pressed && { opacity: 0.7 }]}
            onPress={onOpenDrafts}
            accessibilityLabel={t('post.draft.title')}
          >
            <IconSymbol name="square.and.pencil" size={14} color={tintColor} />
            <ThemedText style={[styles.draftsPillText, { color: tintColor }]}>
              {t('post.draft.openButton', { count: drafts.length })}
            </ThemedText>
          </Pressable>
        </View>
      ) : null}

      {/*
       * Mode picker. Replies / quotes can still opt into auto-thread.
       * Long-form is hidden in those contexts since Leaflet documents
       * aren't replies.
       */}
      {!isQuote ? (
        <View style={styles.modePickerRow}>
          <ModeChip
            label={t('post.mode.single')}
            active={composeMode === 'standard'}
            onPress={() => onSwitchMode('standard')}
            borderColor={borderColor}
            tintColor={tintColor}
            textColor={textColor}
          />
          <ModeChip
            label={t('post.mode.autothread')}
            active={composeMode === 'autothread'}
            onPress={() => onSwitchMode('autothread')}
            borderColor={borderColor}
            tintColor={tintColor}
            textColor={textColor}
          />
          {!isReply ? (
            <ModeChip
              label={t('post.mode.longform')}
              active={composeMode === 'longform'}
              onPress={() => onSwitchMode('longform')}
              borderColor={borderColor}
              tintColor={tintColor}
              textColor={textColor}
            />
          ) : null}
        </View>
      ) : null}

      {composeMode === 'longform' ? (
        <ThemedText style={[styles.modeBanner, { color: iconColor }]}>
          {t('post.longform.banner')}
        </ThemedText>
      ) : null}

      {isLongMode ? (
        <LongModeInputBlock
          mode={composeMode as Exclude<ComposeMode, 'standard'>}
          longText={longText}
          longTitle={longTitle}
          setLongText={setLongText}
          setLongTitle={setLongTitle}
          onLongTextSelectionChange={onLongTextSelectionChange}
          autoThreadChunks={autoThreadChunks}
          attachedImages={rootImages}
          onRemoveImage={(imgIdx) => onRemoveImage(0, imgIdx)}
          onUpdateImageAlt={(imgIdx, alt) => onUpdateImageAlt(0, imgIdx, alt)}
          textColor={textColor}
          iconColor={iconColor}
          borderColor={borderColor}
          backgroundColor={backgroundColor}
          tintColor={tintColor}
        />
      ) : null}

      {!isLongMode &&
        posts.map((post, postIdx) => {
          const isFirst = postIdx === 0;
          const isLast = postIdx === posts.length - 1;
          const slot: 'first' | 'middle' | 'last' | 'only' =
            isFirst && isLast ? 'only' : isFirst ? 'first' : isLast ? 'last' : 'middle';
          return (
            <ThreadPostBlock
              // oxlint-disable-next-line react/no-array-index-key -- ThreadPost has no stable id; composer treats posts positionally
              key={`thread-post-${postIdx}`}
              post={post}
              position={{
                postIdx,
                slot,
                active: postIdx === activeIndex,
                inReplyContext: isReply,
              }}
              quotePreview={postIdx === 0 && isQuote ? previewPost : undefined}
              textColor={textColor}
              iconColor={iconColor}
              borderColor={borderColor}
              backgroundColor={backgroundColor}
              tintColor={tintColor}
              onChangeText={(next) => onChangePostText(postIdx, next)}
              onFocus={() => onFocusPost(postIdx)}
              onSelectionChange={onSelectionChange}
              onRemovePost={() => onRemovePost(postIdx)}
              onAddPost={onAddPost}
              onRemoveImage={(imgIdx) => onRemoveImage(postIdx, imgIdx)}
              onUpdateImageAlt={(imgIdx, alt) => onUpdateImageAlt(postIdx, imgIdx, alt)}
              onRemoveVideo={() => onRemoveVideo(postIdx)}
              onUpdateVideoAlt={(alt) => onUpdateVideoAlt(postIdx, alt)}
            />
          );
        })}
    </ScrollView>
  );
}
