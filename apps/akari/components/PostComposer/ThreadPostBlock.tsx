import { Pressable, View } from 'react-native';

import { Input } from '@/components/ui/Input';

import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useTranslation } from '@/hooks/useTranslation';
import { MAX_POST_CHARACTERS } from '@/utils/postComposer/types';
import type { PostPreview, ThreadPost } from '@/utils/postComposer/types';

import { ImageAttachmentItem } from './ImageAttachmentItem';
import { PostPreviewCard } from './PostPreviewCard';
import { VideoAttachmentItem } from './VideoAttachmentItem';
import { styles } from './styles';

type ThreadPostPosition = {
  /** 0-based index in the thread. */
  postIdx: number;
  /** 'first', 'middle', or 'last' for the divider / add-post button. */
  slot: 'first' | 'middle' | 'last' | 'only';
  /** Whether this post is the currently focused entry. */
  active: boolean;
  /** Whether the surrounding compose is a reply (changes placeholder). */
  inReplyContext: boolean;
};

type ThreadPostBlockProps = {
  post: ThreadPost;
  position: ThreadPostPosition;
  quotePreview?: PostPreview;
  textColor: string;
  iconColor: string;
  borderColor: string;
  backgroundColor: string;
  tintColor: string;
  onChangeText: (next: string) => void;
  onFocus: () => void;
  onSelectionChange: (selection: { start: number; end: number }) => void;
  onRemovePost: () => void;
  onAddPost: () => void;
  onRemoveImage: (imageIdx: number) => void;
  onUpdateImageAlt: (imageIdx: number, alt: string) => void;
  onRemoveVideo: () => void;
  onUpdateVideoAlt: (alt: string) => void;
};

export function ThreadPostBlock({
  post,
  position,
  quotePreview,
  textColor,
  iconColor,
  borderColor,
  backgroundColor,
  tintColor,
  onChangeText,
  onFocus,
  onSelectionChange,
  onRemovePost,
  onAddPost,
  onRemoveImage,
  onUpdateImageAlt,
  onRemoveVideo,
  onUpdateVideoAlt,
}: ThreadPostBlockProps) {
  const { t } = useTranslation();
  const { postIdx, slot, active: isActive, inReplyContext: isReply } = position;
  const isFirst = slot === 'first' || slot === 'only';
  const isLast = slot === 'last' || slot === 'only';

  return (
    <View style={styles.threadPostBlock}>
      {!isFirst ? (
        <View style={[styles.threadDivider, { backgroundColor: borderColor }]} />
      ) : null}
      <View style={styles.inputContainer}>
        <Input
          containerStyle={styles.composerCanvasContainer}
          inputStyle={[styles.textInput, { color: textColor }, !isActive && styles.textInputInactive]}
          value={post.text}
          onChangeText={onChangeText}
          onFocus={onFocus}
          onSelectionChange={(e) => {
            if (isActive) onSelectionChange(e.nativeEvent.selection);
          }}
          placeholder={
            isFirst
              ? isReply
                ? t('post.replyPlaceholder')
                : t('post.postPlaceholder')
              : t('post.continueThreadPlaceholder')
          }
          placeholderTextColor={iconColor}
          multiline
          // oxlint-disable-next-line jsx-a11y/no-autofocus -- composer modal opens with the first post focused so the user can type immediately
          autoFocus={isFirst}
          autoCapitalize="none"
          maxLength={MAX_POST_CHARACTERS}
          textAlignVertical="top"
          selectionColor={tintColor}
          cursorColor={tintColor}
        />
        {!isFirst ? (
          <Pressable
            style={({ pressed }) => [styles.removePostButton, pressed && { opacity: 0.7 }]}
            onPress={onRemovePost}
            accessibilityLabel={t('post.removePostFromThread')}
            hitSlop={10}
          >
            <IconSymbol name="xmark.circle.fill" size={18} color={iconColor} />
          </Pressable>
        ) : null}
      </View>

      {isFirst && quotePreview ? (
        <PostPreviewCard
          post={quotePreview}
          borderColor={borderColor}
          textColor={textColor}
          iconColor={iconColor}
        />
      ) : null}

      {post.attachedImages.length > 0 ? (
        <View style={styles.imagesContainer}>
          {post.attachedImages.map((image, imgIdx) => (
            <ImageAttachmentItem
              // oxlint-disable-next-line react/no-array-index-key -- attached images have no stable id; onRemoveImage / onUpdateImageAlt are already keyed by positional index
              key={`post-${postIdx}-image-${imgIdx}-${image.uri}`}
              image={image}
              onRemove={() => onRemoveImage(imgIdx)}
              onUpdateAlt={(alt) => onUpdateImageAlt(imgIdx, alt)}
              removeTestId={`remove-image-${postIdx}-${imgIdx}`}
              textColor={textColor}
              iconColor={iconColor}
              borderColor={borderColor}
              backgroundColor={backgroundColor}
            />
          ))}
        </View>
      ) : null}

      {post.attachedVideo ? (
        <VideoAttachmentItem
          video={post.attachedVideo}
          onRemove={onRemoveVideo}
          onUpdateAlt={onUpdateVideoAlt}
          removeTestId={`remove-video-${postIdx}`}
          textColor={textColor}
          iconColor={iconColor}
          borderColor={borderColor}
          backgroundColor={backgroundColor}
          tintColor={tintColor}
        />
      ) : null}

      {isLast ? (
        <Pressable
          style={({ pressed }) => [styles.addPostButton, { borderColor }, pressed && { opacity: 0.7 }]}
          onPress={onAddPost}
          accessibilityLabel={t('post.addPostToThread')}
        >
          <IconSymbol name="plus" size={14} color={tintColor} />
          <ThemedText style={[styles.addPostText, { color: tintColor }]}>
            {t('post.addPostToThread')}
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}
