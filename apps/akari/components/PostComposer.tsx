import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { BlueskyEmbed } from '@/bluesky-api';
import { GifPicker } from '@/components/GifPicker';
import { RichTextWithFacets } from '@/components/RichTextWithFacets';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { spacing, radius, fontSize, fontWeight, opacity, layout, shadows } from '@/constants/tokens';
import { useToast } from '@/contexts/ToastContext';
import { useCreatePost } from '@/hooks/mutations/useCreatePost';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

type PostFacet = {
  index: { byteStart: number; byteEnd: number };
  features: { $type: string; uri?: string; tag?: string; did?: string }[];
};

type PostPreview = {
  text?: string;
  author: {
    handle: string;
    displayName?: string;
    avatar?: string;
  };
  embed?: BlueskyEmbed;
  embeds?: BlueskyEmbed[];
  facets?: PostFacet[];
};

type QuotedPost = PostPreview & {
  uri: string;
  cid: string;
  indexedAt?: string;
};

type QuotedImage = { url: string; aspectRatio?: number };

function extractQuotedMedia(quote?: QuotedPost): {
  images: QuotedImage[];
  video: { thumb: string; aspectRatio?: number } | null;
  external: { thumb: string } | null;
} {
  if (!quote) {
    return { images: [], video: null, external: null };
  }

  const candidates: (BlueskyEmbed | undefined)[] = [
    quote.embed,
    ...(quote.embeds ?? []),
  ];

  const images: QuotedImage[] = [];
  let video: { thumb: string; aspectRatio?: number } | null = null;
  let external: { thumb: string } | null = null;

  const ratioFrom = (ar?: { width: number; height: number }) =>
    ar && ar.width > 0 && ar.height > 0 ? ar.width / ar.height : undefined;

  const visit = (embed?: BlueskyEmbed | null) => {
    if (!embed) return;

    if (
      (embed.$type === 'app.bsky.embed.images#view' || embed.$type === 'app.bsky.embed.images') &&
      embed.images
    ) {
      for (const img of embed.images) {
        const url = img.thumb || img.fullsize;
        const isVideoFile = img.image?.mimeType?.startsWith('video/');
        if (url && !isVideoFile && images.length < 4) {
          images.push({ url, aspectRatio: ratioFrom(img.aspectRatio) });
        }
      }
    }

    if (embed.$type === 'app.bsky.embed.video#view' && (embed.thumbnail || embed.playlist)) {
      const thumb = embed.thumbnail;
      if (thumb && !video) {
        video = { thumb, aspectRatio: ratioFrom(embed.aspectRatio) };
      }
    }

    if (embed.$type?.includes('app.bsky.embed.external') && embed.external?.thumb?.ref?.$link) {
      external = { thumb: embed.external.thumb.ref.$link };
    }

    // recordWithMedia: descend into media
    if (embed.media) visit(embed.media as unknown as BlueskyEmbed);
  };

  for (const c of candidates) visit(c);

  return { images, video, external };
}

type PostComposerProps = {
  visible: boolean;
  onClose: () => void;
  replyTo?: {
    root: string;
    parent: string;
    authorHandle: string;
    /** Optional preview data — renders the parent post above the input. */
    preview?: PostPreview;
  };
  /** Optional quoted post — renders an inline preview and includes
   * `embed.record` (or `embed.recordWithMedia` if images are attached)
   * when the post is published. */
  quote?: QuotedPost;
};

type AttachedImage = {
  uri: string;
  alt: string;
  mimeType: string;
  tenorId?: string;
};

const isWeb = Platform.OS === 'web';
const nativePresentationStyle: 'pageSheet' | 'fullScreen' | undefined =
  Platform.OS === 'ios' ? 'pageSheet' : Platform.OS === 'android' ? 'fullScreen' : undefined;

export function PostComposer({ visible, onClose, replyTo, quote }: PostComposerProps) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [attachedImages, setAttachedImages] = useState<AttachedImage[]>([]);
  const [gifPickerVisible, setGifPickerVisible] = useState(false);
  const createPostMutation = useCreatePost();
  const { showToast } = useToast();
  const { bottom, top } = useSafeAreaInsets();

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');
  const iconColor = useThemeColor({}, 'icon');
  const tintColor = useThemeColor({}, 'tint');

  const handlePost = async () => {
    if (!text.trim() && attachedImages.length === 0 && !quote) return;

    try {
      await createPostMutation.mutateAsync({
        text: text.trim(),
        replyTo: replyTo
          ? {
              root: replyTo.root,
              parent: replyTo.parent,
            }
          : undefined,
        images: attachedImages.length > 0 ? attachedImages : undefined,
        quote: quote ? { uri: quote.uri, cid: quote.cid } : undefined,
      });

      // Reset form and close
      setText('');
      setAttachedImages([]);
      onClose();
    } catch (error) {
      console.error('Failed to create post:', error);
      showToast({
        type: 'error',
        title: t('post.post'),
        message: t('common.error'),
      });
    }
  };

  const handleClose = useCallback(() => {
    setText('');
    setAttachedImages([]);
    setGifPickerVisible(false);
    onClose();
  }, [onClose]);

  const handleAddImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets) {
      const newImages = result.assets.map((asset) => ({
        uri: asset.uri,
        alt: '',
        mimeType: asset.mimeType || 'image/jpeg',
      }));

      const totalImages = attachedImages.length + newImages.length;
      if (totalImages <= 4) {
        setAttachedImages([...attachedImages, ...newImages]);
      } else {
        const remainingSlots = 4 - attachedImages.length;
        setAttachedImages([...attachedImages, ...newImages.slice(0, remainingSlots)]);
      }
    }
  };

  const handleRemoveImage = (index: number) => {
    setAttachedImages(attachedImages.filter((_, i) => i !== index));
  };

  const handleUpdateImageAlt = (index: number, alt: string) => {
    const updatedImages = [...attachedImages];
    updatedImages[index] = { ...updatedImages[index], alt };
    setAttachedImages(updatedImages);
  };

  const handleAddGif = () => {
    setGifPickerVisible(true);
  };

  const handleSelectGif = (gif: AttachedImage) => {
    if (attachedImages.length < 4) {
      setAttachedImages([...attachedImages, gif]);
    }
  };

  const isPostDisabled =
    (!text.trim() && attachedImages.length === 0 && !quote) || createPostMutation.isPending;
  const previewPost: PostPreview | undefined = quote ?? replyTo?.preview;
  const characterCount = text.length;
  const maxCharacters = 300;
  const isNearLimit = characterCount > maxCharacters * 0.8;
  const isOverLimit = characterCount > maxCharacters;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={nativePresentationStyle}
      transparent={isWeb}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView style={styles.keyboardAvoidingView} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ThemedView
          testID="post-composer-container"
          style={[
            styles.container,
            { backgroundColor },
            isWeb && styles.webContainer,
            !isWeb && { paddingTop: Platform.OS === 'android' ? top : 0, paddingBottom: bottom },
          ]}
        >
          {/* Header */}
          <View
            style={[
              styles.header,
              {
                borderBottomColor: borderColor,
              },
            ]}
          >
            <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
              <ThemedText style={[styles.headerButtonText, { color: iconColor }]}>{t('common.cancel')}</ThemedText>
            </TouchableOpacity>

            <ThemedText type="defaultSemiBold" style={[styles.headerTitle, { color: textColor }]}>
              {replyTo
                ? t('post.reply')
                : quote
                ? t('post.quotePost')
                : t('post.newPost')}
            </ThemedText>

            <TouchableOpacity
              onPress={handlePost}
              style={[
                styles.postButton,
                isPostDisabled ? styles.postButtonDisabled : styles.postButtonEnabled,
                { backgroundColor: isPostDisabled ? borderColor : tintColor },
              ]}
              disabled={isPostDisabled}
            >
              <ThemedText style={[styles.postButtonText, { color: isPostDisabled ? textColor : '#000000' }]}>
                {createPostMutation.isPending ? t('post.posting') : t('post.post')}
              </ThemedText>
            </TouchableOpacity>
          </View>

          {/* Reply Context */}
          {replyTo && (
            <ThemedView
              style={[
                styles.replyContext,
                {
                  borderBottomColor: borderColor,
                },
              ]}
            >
              <View style={[styles.replyIconContainer, { backgroundColor: borderColor }]}>
                <IconSymbol name="arrowshape.turn.up.left" size={14} color={iconColor} />
              </View>
              <ThemedText style={[styles.replyText, { color: textColor }]}>
                {t('post.replyingTo')}{' '}
                <ThemedText style={[styles.replyAuthor, { color: tintColor }]}>@{replyTo.authorHandle}</ThemedText>
              </ThemedText>
            </ThemedView>
          )}

          {/* Content Area */}
          <ScrollView style={styles.contentArea} showsVerticalScrollIndicator={false}>
            {/* Reply preview shown above input */}
            {replyTo && previewPost ? (
              <PostPreviewCard
                post={previewPost}
                borderColor={borderColor}
                textColor={textColor}
                iconColor={iconColor}
              />
            ) : null}

            {/* Text Input */}
            <View style={styles.inputContainer}>
              <TextInput
                style={[
                  styles.textInput,
                  { color: textColor },
                  isWeb && { outline: 'none' },
                ]}
                value={text}
                onChangeText={setText}
                placeholder={replyTo ? t('post.replyPlaceholder') : t('post.postPlaceholder')}
                placeholderTextColor={iconColor}
                multiline
                autoFocus
                autoCapitalize="none"
                maxLength={maxCharacters}
                textAlignVertical="top"
                selectionColor={tintColor}
                cursorColor={tintColor}
              />
            </View>

            {/* Quote preview shown below input */}
            {quote && previewPost ? (
              <PostPreviewCard
                post={previewPost}
                borderColor={borderColor}
                textColor={textColor}
                iconColor={iconColor}
              />
            ) : null}

            {/* Attached Images */}
            {attachedImages.length > 0 && (
              <View style={styles.imagesContainer}>
                {attachedImages.map((image, index) => (
                  <View key={index} style={styles.imageItem}>
                    <View style={styles.imageContainer}>
                      <Image source={{ uri: image.uri }} style={styles.attachedImage} contentFit="contain" />
                      <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={() => handleRemoveImage(index)}
                        testID={`remove-image-${index}`}
                      >
                        <IconSymbol name="xmark" size={16} color="#ffffff" />
                      </TouchableOpacity>
                    </View>
                    <TextInput
                      style={[styles.altTextInput, { color: textColor, borderColor, backgroundColor }]}
                      value={image.alt}
                      onChangeText={(alt) => handleUpdateImageAlt(index, alt)}
                      placeholder={t('post.imageAltTextPlaceholder')}
                      placeholderTextColor={iconColor}
                      maxLength={1000}
                    />
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          {/* Footer with Character Count and Actions */}
          <View
            style={[
              styles.footer,
              {
                borderTopColor: borderColor,
              },
            ]}
          >
            <View style={styles.footerLeft}>
              <TouchableOpacity
                style={[styles.actionButton, attachedImages.length >= 4 && styles.actionButtonDisabled]}
                onPress={handleAddImage}
                disabled={attachedImages.length >= 4}
                accessibilityLabel={t('post.addPhoto')}
                accessibilityHint={t('post.selectPhoto')}
              >
                <IconSymbol name="photo" size={20} color={attachedImages.length >= 4 ? iconColor : tintColor} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, attachedImages.length >= 4 && styles.actionButtonDisabled]}
                onPress={handleAddGif}
                disabled={attachedImages.length >= 4}
                accessibilityLabel={t('gif.addGif')}
                accessibilityHint={t('gif.selectGif')}
              >
                <IconSymbol name="gif" size={20} color={attachedImages.length >= 4 ? iconColor : tintColor} />
              </TouchableOpacity>
            </View>

            <View style={styles.footerRight}>
              <View style={styles.characterCountContainer}>
                <ThemedText
                  style={[
                    styles.characterCount,
                    {
                      color: isOverLimit ? '#FF3B30' : isNearLimit ? '#FF9500' : iconColor,
                    },
                  ]}
                >
                  {characterCount}
                </ThemedText>
                <ThemedText style={[styles.characterCount, { color: iconColor }]}>/{maxCharacters}</ThemedText>
              </View>
            </View>
          </View>
        </ThemedView>
      </KeyboardAvoidingView>

      {/* GIF Picker Modal */}
      <GifPicker visible={gifPickerVisible} onClose={() => setGifPickerVisible(false)} onSelectGif={handleSelectGif} />
    </Modal>
  );
}

type PostPreviewCardProps = {
  post: PostPreview;
  borderColor: string;
  textColor: string;
  iconColor: string;
};

function PostPreviewCard({ post, borderColor, textColor, iconColor }: PostPreviewCardProps) {
  const media = extractQuotedMedia({
    uri: '',
    cid: '',
    author: post.author,
    embed: post.embed,
    embeds: post.embeds,
  });
  const hasImages = media.images.length > 0;
  const hasVideo = !!media.video;
  const hasExternal = !!media.external;

  return (
    <View style={styles.quoteContainer}>
      <ThemedView style={[styles.quoteCard, { borderColor }]}>
        <View style={styles.quoteHeader}>
          {post.author.avatar ? (
            <Image source={{ uri: post.author.avatar }} style={styles.quoteAvatar} />
          ) : (
            <View style={[styles.quoteAvatar, { backgroundColor: borderColor }]} />
          )}
          <View style={styles.quoteAuthorText}>
            {post.author.displayName ? (
              <ThemedText
                style={[styles.quoteAuthorName, { color: textColor }]}
                numberOfLines={1}
              >
                {post.author.displayName}
              </ThemedText>
            ) : null}
            <ThemedText
              style={[styles.quoteAuthorHandle, { color: iconColor }]}
              numberOfLines={1}
            >
              @{post.author.handle}
            </ThemedText>
          </View>
        </View>

        {post.text ? (
          <RichTextWithFacets
            text={post.text}
            facets={post.facets}
            disableLinks
            style={[styles.quoteText, { color: textColor }]}
          />
        ) : null}

        {hasVideo && media.video && (
          <View
            style={[
              styles.quoteMediaSingle,
              { aspectRatio: media.video.aspectRatio ?? 16 / 9 },
            ]}
          >
            <Image
              source={{ uri: media.video.thumb }}
              style={styles.quoteMediaImage}
              contentFit="cover"
            />
            <View style={styles.quoteVideoBadge}>
              <IconSymbol name="play.fill" size={18} color="#ffffff" />
            </View>
          </View>
        )}

        {!hasVideo && hasImages && media.images.length === 1 && (
          <Image
            source={{ uri: media.images[0].url }}
            style={[
              styles.quoteImageSingle,
              { aspectRatio: media.images[0].aspectRatio ?? 1 },
            ]}
            contentFit="cover"
          />
        )}

        {!hasVideo && hasImages && media.images.length > 1 && (
          <View style={styles.quoteImagesRow}>
            {media.images.map((img, idx) => (
              <Image
                key={`${img.url}-${idx}`}
                source={{ uri: img.url }}
                style={styles.quoteImageThumb}
                contentFit="cover"
              />
            ))}
          </View>
        )}

        {!hasVideo && !hasImages && hasExternal && media.external && (
          <View style={[styles.quoteMediaSingle, { aspectRatio: 1.91 }]}>
            <Image
              source={{ uri: media.external.thumb }}
              style={styles.quoteMediaImage}
              contentFit="cover"
            />
          </View>
        )}
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  webContainer: {
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
    maxHeight: '90%',
    marginVertical: spacing.xl,
    borderRadius: spacing.lg,
    ...shadows.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: layout.hairline,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerButton: {
    padding: spacing.sm,
    borderRadius: radius.sm,
  },
  headerButtonText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: fontWeight.semibold,
  },
  postButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.xl,
    minWidth: 60,
    alignItems: 'center',
  },
  postButtonEnabled: {
    ...shadows.sm,
  },
  postButtonDisabled: {
    opacity: opacity.disabled,
  },
  postButtonText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  replyContext: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: layout.hairline,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  replyIconContainer: {
    width: spacing.xxl,
    height: spacing.xxl,
    borderRadius: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  replyText: {
    fontSize: 15,
    opacity: 0.8,
  },
  replyAuthor: {
    fontWeight: fontWeight.semibold,
  },
  contentArea: {
    flex: 1,
  },
  inputContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  textInput: {
    fontSize: 18,
    lineHeight: 26,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  imagesContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  quoteContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  quoteCard: {
    borderWidth: layout.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  quoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  quoteAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  quoteAuthorText: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  quoteAuthorName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  quoteAuthorHandle: {
    fontSize: fontSize.sm,
  },
  quoteText: {
    fontSize: fontSize.base,
    lineHeight: 20,
  },
  quoteImagesRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  quoteImageThumb: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: radius.sm,
  },
  quoteImageSingle: {
    width: '100%',
    borderRadius: radius.sm,
  },
  quoteMediaSingle: {
    width: '100%',
    borderRadius: radius.sm,
    overflow: 'hidden',
    position: 'relative',
  },
  quoteMediaImage: {
    width: '100%',
    height: '100%',
  },
  quoteVideoBadge: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -18,
    marginTop: -18,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageItem: {
    marginBottom: spacing.lg,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
  },
  attachedImage: {
    width: '100%',
    height: 200,
  },
  removeImageButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: spacing.md,
    padding: 6,
    width: spacing.xxl,
    height: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  altTextInput: {
    padding: spacing.md,
    fontSize: fontSize.base,
    borderTopWidth: layout.border,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: layout.hairline,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
  },
  footerLeft: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs,
  },
  footerRight: {
    alignItems: 'flex-end',
  },
  actionButton: {
    padding: 6,
    borderRadius: 6,
  },
  actionButtonDisabled: {
    opacity: opacity.tertiary,
  },
  characterCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  characterCount: {
    fontSize: 15,
    fontWeight: fontWeight.medium,
  },
});
