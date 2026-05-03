import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
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
import { DraftsSheet } from '@/components/DraftsSheet';
import { EmojiPicker } from '@/components/EmojiPicker';
import { GifPicker } from '@/components/GifPicker';
import { PostControlsSheet } from '@/components/PostControlsSheet';
import { RichTextWithFacets } from '@/components/RichTextWithFacets';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { spacing, radius, fontSize, fontWeight, opacity, layout, shadows } from '@/constants/tokens';
import { useToast } from '@/contexts/ToastContext';
import { useCreatePost } from '@/hooks/mutations/useCreatePost';
import {
  useCreateDraft,
  useDeleteDraft,
  useUpdateDraft,
} from '@/hooks/mutations/useDraftMutations';
import { usePostControls } from '@/hooks/mutations/usePostControls';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useDrafts } from '@/hooks/queries/useDrafts';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import type { ComposerDraftState } from '@/utils/draftMapper';
import { DEFAULT_POST_CONTROLS, describePostControls, type PostControls } from '@/utils/postControls';

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
  const [emojiPickerVisible, setEmojiPickerVisible] = useState(false);
  const [controlsSheetVisible, setControlsSheetVisible] = useState(false);
  const [postControls, setPostControls] = useState<PostControls>(DEFAULT_POST_CONTROLS);
  const [textSelection, setTextSelection] = useState<{ start: number; end: number }>({ start: 0, end: 0 });
  const createPostMutation = useCreatePost();
  const postControlsMutation = usePostControls();
  const { showToast } = useToast();
  const { bottom, top } = useSafeAreaInsets();
  const { data: currentAccount } = useCurrentAccount();
  const did = currentAccount?.did;

  // Drafts only apply to plain new posts — re-opening a stale reply/quote
  // composer with mismatched context is more confusing than helpful.
  const draftsApply = !replyTo && !quote;

  // Server-side drafts via app.bsky.draft.*. Only fetched when the
  // composer is visible and we're in plain-post mode.
  const draftsQuery = useDrafts(visible && draftsApply);
  const drafts = draftsQuery.data ?? [];
  const createDraftMutation = useCreateDraft();
  const updateDraftMutation = useUpdateDraft();
  const deleteDraftMutation = useDeleteDraft();

  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [draftsSheetVisible, setDraftsSheetVisible] = useState(false);

  // Mirror the id into a ref so the async save loop never reads stale state.
  const draftIdRef = useRef<string | null>(null);
  useEffect(() => {
    draftIdRef.current = currentDraftId;
  }, [currentDraftId]);

  // Single-flight drain loop. New saves overwrite `pendingPayloadRef`;
  // `savePromiseRef` holds the active drain so concurrent callers can
  // await the same completion (the autosave timer kicks one off, the
  // close-alert "Save draft" button needs to wait for it).
  const savePromiseRef = useRef<Promise<void> | null>(null);
  const pendingPayloadRef = useRef<{
    text: string;
    images: AttachedImage[];
    controls: PostControls;
  } | null>(null);
  const hydratedRef = useRef(false);

  // Reset state on each open cycle. We do NOT auto-load any draft — the
  // user picks one explicitly via the drafts pill.
  useEffect(() => {
    if (!visible) {
      hydratedRef.current = false;
      pendingPayloadRef.current = null;
      return;
    }
    setCurrentDraftId(null);
    draftIdRef.current = null;
    pendingPayloadRef.current = null;
    hydratedRef.current = true;
  }, [visible]);

  // The `mutate*` methods on react-query mutations are stable across
  // renders, but the surrounding result objects are not — pulling them
  // into useCallback deps would invalidate the callback on every
  // mutation state transition. We keep references to the stable methods
  // in refs so `runSave` itself can stay stable.
  const createMutateRef = useRef(createDraftMutation.mutateAsync);
  const updateMutateRef = useRef(updateDraftMutation.mutateAsync);
  const deleteMutateRef = useRef(deleteDraftMutation.mutateAsync);
  useEffect(() => {
    createMutateRef.current = createDraftMutation.mutateAsync;
    updateMutateRef.current = updateDraftMutation.mutateAsync;
    deleteMutateRef.current = deleteDraftMutation.mutateAsync;
  });

  const runSave = useCallback(
    (payload: {
      text: string;
      images: AttachedImage[];
      controls: PostControls;
    }): Promise<void> => {
      pendingPayloadRef.current = payload;
      // If a drain is already running, the loop will pick up our payload
      // on its next iteration. Returning that promise lets the caller
      // await full completion — important for the close-alert "Save
      // draft" path, which must finish before resetAndClose() clears
      // `draftIdRef.current`.
      if (savePromiseRef.current) return savePromiseRef.current;
      const drain = (async () => {
        // Yield once so the outer `savePromiseRef.current = drain`
        // assignment lands BEFORE the finally below runs. Without this,
        // a synchronous-only path through the loop (e.g. an empty
        // payload with no draft id, which `continue`s and exits) would
        // null savePromiseRef inside the IIFE, then the outer code
        // would re-assign it to a now-resolved promise — leaving a
        // stale reference that blocks every subsequent save.
        await Promise.resolve();
        try {
          while (pendingPayloadRef.current) {
            const next = pendingPayloadRef.current;
            pendingPayloadRef.current = null;
            const isEmpty =
              next.text.trim().length === 0 && next.images.length === 0;
            try {
              if (isEmpty) {
                if (!draftIdRef.current) continue;
                const id = draftIdRef.current;
                draftIdRef.current = null;
                setCurrentDraftId(null);
                await deleteMutateRef.current({ id });
              } else if (draftIdRef.current) {
                await updateMutateRef.current({
                  id: draftIdRef.current,
                  ...next,
                });
              } else {
                const created = await createMutateRef.current(next);
                draftIdRef.current = created.id;
                setCurrentDraftId(created.id);
              }
            } catch (err) {
              const code = (err as { errorCode?: string } | null)?.errorCode;
              if (code === 'DraftLimitReached') {
                showToast({
                  type: 'error',
                  message: t('post.draft.limitReached'),
                });
                // Stop draining — the user needs to delete one before retrying.
                pendingPayloadRef.current = null;
                break;
              }
              if (__DEV__) console.warn('Draft save failed', err);
            }
          }
        } finally {
          savePromiseRef.current = null;
        }
      })();
      savePromiseRef.current = drain;
      return drain;
    },
    [showToast, t],
  );

  // Debounced autosave on form changes. We ONLY autosave drafts that
  // the user explicitly opened from the drafts sheet — fresh composes
  // never auto-create a draft. The user must tap "Save draft" via the
  // close alert to persist a new draft. This prevents a brand-new
  // session from ever silently overwriting (or replacing) an unrelated
  // existing draft.
  useEffect(() => {
    if (!visible || !draftsApply || !did || !hydratedRef.current) return;
    if (!currentDraftId) return;
    const timeout = setTimeout(() => {
      runSave({ text, images: attachedImages, controls: postControls });
    }, 800);
    return () => clearTimeout(timeout);
  }, [visible, draftsApply, did, currentDraftId, text, attachedImages, postControls, runSave]);

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');
  const iconColor = useThemeColor({}, 'icon');
  const tintColor = useThemeColor({}, 'tint');

  const handlePost = async () => {
    if (!text.trim() && attachedImages.length === 0 && !quote) return;

    try {
      const created = await createPostMutation.mutateAsync({
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

      // Threadgate / postgate: only writes when the user actually changed
      // the controls away from the defaults. Failure here doesn't block
      // closing the composer — the post is already up.
      if (created?.uri) {
        postControlsMutation
          .mutateAsync({ postUri: created.uri, controls: postControls })
          .catch((err) => {
            if (__DEV__) console.warn('Failed to set post controls', err);
          });
      }

      // Drop the in-progress draft now that the post is up.
      if (draftsApply && currentDraftId) {
        deleteDraftMutation.mutate({ id: currentDraftId });
      }

      // Reset form and close
      setText('');
      setAttachedImages([]);
      setPostControls(DEFAULT_POST_CONTROLS);
      setCurrentDraftId(null);
      draftIdRef.current = null;
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

  const resetAndClose = useCallback(() => {
    setText('');
    setAttachedImages([]);
    setPostControls(DEFAULT_POST_CONTROLS);
    setCurrentDraftId(null);
    draftIdRef.current = null;
    setGifPickerVisible(false);
    onClose();
  }, [onClose]);

  const handleClose = useCallback(() => {
    const hasContent = text.trim().length > 0 || attachedImages.length > 0;
    if (draftsApply && did && hasContent) {
      Alert.alert(t('post.draft.discardTitle'), undefined, [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('post.draft.discard'),
          style: 'destructive',
          onPress: () => {
            if (currentDraftId) deleteDraftMutation.mutate({ id: currentDraftId });
            resetAndClose();
          },
        },
        {
          text: t('post.draft.saveDraft'),
          onPress: async () => {
            // Flush any pending debounce so the latest content lands on the
            // server before we close. runSave serializes against any
            // already-running save.
            await runSave({ text, images: attachedImages, controls: postControls });
            showToast({ type: 'success', message: t('post.draft.savedToast') });
            resetAndClose();
          },
        },
      ]);
      return;
    }
    resetAndClose();
  }, [
    draftsApply,
    did,
    text,
    attachedImages,
    postControls,
    currentDraftId,
    deleteDraftMutation,
    runSave,
    t,
    showToast,
    resetAndClose,
  ]);

  const handleSelectDraft = useCallback((draft: ComposerDraftState) => {
    setText(draft.text);
    setAttachedImages(draft.images);
    setPostControls(draft.controls);
    setCurrentDraftId(draft.id);
    draftIdRef.current = draft.id;
    setDraftsSheetVisible(false);
  }, []);

  const handleDeleteDraft = useCallback(
    (draft: ComposerDraftState) => {
      deleteDraftMutation.mutate({ id: draft.id });
      if (currentDraftId === draft.id) {
        setCurrentDraftId(null);
        draftIdRef.current = null;
      }
    },
    [deleteDraftMutation, currentDraftId],
  );

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

  const handleInsertEmoji = (emoji: string) => {
    // Insert the emoji at the current cursor position. Falls back to
    // appending to the end when the user hasn't selected anywhere yet.
    const { start, end } = textSelection;
    const safeStart = Math.min(Math.max(start, 0), text.length);
    const safeEnd = Math.min(Math.max(end, safeStart), text.length);
    setText(text.slice(0, safeStart) + emoji + text.slice(safeEnd));
    const next = safeStart + emoji.length;
    setTextSelection({ start: next, end: next });
    setEmojiPickerVisible(false);
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

            {draftsApply && drafts.length > 0 ? (
              <View style={styles.draftsBar}>
                <TouchableOpacity
                  style={[styles.draftsPill, { borderColor }]}
                  onPress={() => {
                    draftsQuery.refetch();
                    setDraftsSheetVisible(true);
                  }}
                  accessibilityLabel={t('post.draft.title')}
                >
                  <IconSymbol name="square.and.pencil" size={14} color={tintColor} />
                  <ThemedText style={[styles.draftsPillText, { color: tintColor }]}>
                    {t('post.draft.openButton', { count: drafts.length })}
                  </ThemedText>
                </TouchableOpacity>
              </View>
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
                onSelectionChange={(e) => setTextSelection(e.nativeEvent.selection)}
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
                style={styles.actionButton}
                onPress={() => setEmojiPickerVisible(true)}
                accessibilityLabel={t('post.addEmoji')}
              >
                <IconSymbol name="face.smiling" size={20} color={tintColor} />
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

            <View style={styles.footerCenter} pointerEvents="box-none">
              {!replyTo ? (
                <TouchableOpacity
                  style={styles.controlsButton}
                  onPress={() => setControlsSheetVisible(true)}
                  accessibilityLabel={t('post.controls.title')}
                >
                  <IconSymbol name="bubble.left.and.bubble.right" size={16} color={tintColor} />
                  <ThemedText
                    style={[styles.controlsButtonText, { color: tintColor }]}
                    numberOfLines={1}
                  >
                    {describePostControls(postControls, t as any)}
                  </ThemedText>
                </TouchableOpacity>
              ) : null}
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
      <EmojiPicker
        visible={emojiPickerVisible}
        onClose={() => setEmojiPickerVisible(false)}
        onSelectEmoji={handleInsertEmoji}
      />
      <PostControlsSheet
        visible={controlsSheetVisible}
        initialControls={postControls}
        onDismiss={() => setControlsSheetVisible(false)}
        onSave={(next) => {
          setPostControls(next);
          setControlsSheetVisible(false);
        }}
      />
      <DraftsSheet
        visible={draftsSheetVisible}
        drafts={drafts}
        onDismiss={() => setDraftsSheetVisible(false)}
        onSelect={handleSelectDraft}
        onDelete={handleDeleteDraft}
      />
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
  draftsBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    flexDirection: 'row',
  },
  draftsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: layout.hairline,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  draftsPillText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
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
    // Container is the positioning context for the absolute-centered
    // threadgate button (see footerCenter).
    position: 'relative',
  },
  controlsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    maxWidth: 220,
  },
  controlsButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    flexShrink: 1,
  },
  footerLeft: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  footerCenter: {
    // Absolute-position the centered control so it's centered on the
    // FOOTER (not split-the-difference of leftover space). pointerEvents
    // box-none lets taps still hit footerLeft / footerRight when the
    // button doesn't cover them.
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
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
