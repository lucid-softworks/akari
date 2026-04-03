import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
  type PanResponderInstance,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GifPicker } from '@/components/GifPicker';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { spacing, radius, fontSize, fontWeight, opacity, layout, shadows } from '@/constants/tokens';
import { useToast } from '@/contexts/ToastContext';
import { useCreatePost } from '@/hooks/mutations/useCreatePost';
import { useResponsive } from '@/hooks/useResponsive';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

type PostComposerProps = {
  visible: boolean;
  onClose: () => void;
  replyTo?: {
    root: string;
    parent: string;
    authorHandle: string;
  };
};

type AttachedImage = {
  uri: string;
  alt: string;
  mimeType: string;
  tenorId?: string;
};

export function PostComposer({ visible, onClose, replyTo }: PostComposerProps) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [attachedImages, setAttachedImages] = useState<AttachedImage[]>([]);
  const [gifPickerVisible, setGifPickerVisible] = useState(false);
  const createPostMutation = useCreatePost();
  const { showToast } = useToast();
  const { bottom } = useSafeAreaInsets();
  const { isMobile } = useResponsive();
  const { height: windowHeight } = useWindowDimensions();

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');
  const iconColor = useThemeColor({}, 'icon');
  const tintColor = useThemeColor({}, 'tint');
  const drawerHandleColor = useThemeColor({ light: '#E5E7EB', dark: '#1F2937' }, 'border');

  const baseMinHeight = Math.max(windowHeight * 0.45, 280);
  const baseMaxHeight = Math.max(windowHeight - 32, 320);
  const minDrawerHeight = Math.min(baseMinHeight, baseMaxHeight);
  const maxDrawerHeight = Math.max(baseMaxHeight, minDrawerHeight);

  const clampDrawerHeight = useCallback(
    (value: number) => Math.min(maxDrawerHeight, Math.max(minDrawerHeight, value)),
    [maxDrawerHeight, minDrawerHeight],
  );

  const initialDrawerHeight = useMemo(
    () => (isMobile ? clampDrawerHeight(windowHeight * 0.7) : undefined),
    [clampDrawerHeight, isMobile, windowHeight],
  );

  const [drawerHeight, setDrawerHeight] = useState<number | undefined>(initialDrawerHeight);
  const drawerHeightRef = useRef<number | undefined>(initialDrawerHeight);
  const panStartHeightRef = useRef<number>(initialDrawerHeight ?? minDrawerHeight);

  useEffect(() => {
    if (!isMobile) {
      setDrawerHeight(undefined);
      drawerHeightRef.current = undefined;
      return;
    }

    if (!visible) {
      return;
    }

    const nextHeight = clampDrawerHeight(windowHeight * 0.7);
    setDrawerHeight(nextHeight);
    drawerHeightRef.current = nextHeight;
  }, [clampDrawerHeight, isMobile, visible, windowHeight]);

  const applyDrawerHeight = useCallback(
    (value: number) => {
      if (!isMobile) {
        return;
      }

      const clampedHeight = clampDrawerHeight(value);
      drawerHeightRef.current = clampedHeight;
      setDrawerHeight(clampedHeight);
    },
    [clampDrawerHeight, isMobile],
  );

  const handlePanResponder: PanResponderInstance = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => isMobile,
        onMoveShouldSetPanResponder: () => isMobile,
        onPanResponderGrant: () => {
          if (!isMobile) {
            return;
          }

          panStartHeightRef.current = drawerHeightRef.current ?? clampDrawerHeight(windowHeight * 0.7);
        },
        onPanResponderMove: (_, gestureState) => {
          if (!isMobile) {
            return;
          }

          applyDrawerHeight(panStartHeightRef.current - gestureState.dy);
        },
        onPanResponderRelease: (_, gestureState) => {
          if (!isMobile) {
            return;
          }

          applyDrawerHeight(panStartHeightRef.current - gestureState.dy);
        },
        onPanResponderTerminate: (_, gestureState) => {
          if (!isMobile) {
            return;
          }

          applyDrawerHeight(panStartHeightRef.current - gestureState.dy);
        },
      }),
    [applyDrawerHeight, clampDrawerHeight, isMobile, windowHeight],
  );

  const drawerPaddingHorizontal = isMobile ? spacing.lg : spacing.xl;
  const drawerHeaderVerticalPadding = isMobile ? spacing.md : spacing.lg;
  const drawerInputVerticalPadding = isMobile ? spacing.lg : spacing.xl;
  const drawerFooterVerticalPadding = isMobile ? 10 : spacing.md;
  const drawerTextMinHeight = isMobile ? 120 : 140;

  const handlePost = async () => {
    if (!text.trim() && attachedImages.length === 0) return;

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
      });

      // Reset form and close
      setText('');
      setAttachedImages([]);
      onClose();
    } catch (error) {
      // Error handling could be improved with a proper error display
      console.error('Failed to create post:', error);
      showToast({
        type: 'error',
        title: t('post.post'),
        message: t('common.error'),
      });
    }
  };

  const handleClose = () => {
    setText('');
    setAttachedImages([]);
    setGifPickerVisible(false);
    onClose();
  };

  const handleAddImage = async () => {
    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      // Handle permission denied
      return;
    }

    // Launch image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets) {
      const newImages = result.assets.map((asset) => ({
        uri: asset.uri,
        alt: '', // User can edit this later
        mimeType: asset.mimeType || 'image/jpeg',
      }));

      // Limit to 4 images (Bluesky limit)
      const totalImages = attachedImages.length + newImages.length;
      if (totalImages <= 4) {
        setAttachedImages([...attachedImages, ...newImages]);
      } else {
        // Only add images up to the limit
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
    // Limit to 4 images (Bluesky limit)
    if (attachedImages.length < 4) {
      setAttachedImages([...attachedImages, gif]);
    }
  };

  const isPostDisabled = (!text.trim() && attachedImages.length === 0) || createPostMutation.isPending;
  const characterCount = text.length;
  const maxCharacters = 300;
  const isNearLimit = characterCount > maxCharacters * 0.8;
  const isOverLimit = characterCount > maxCharacters;
  const animationType = isMobile && Platform.OS !== 'web' ? 'slide' : 'fade';

  return (
    <Modal visible={visible} transparent animationType={animationType} onRequestClose={handleClose}>
      <KeyboardAvoidingView style={styles.keyboardAvoidingView} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ThemedView style={[styles.overlay, isMobile && styles.mobileOverlay]}>
          <Pressable
            style={[StyleSheet.absoluteFill, styles.backdropPressable]}
            pointerEvents="box-only"
            onPress={handleClose}
            accessibilityRole="button"
            accessibilityLabel={t('common.cancel')}
          />
          <ThemedView
            testID="post-composer-container"
            style={[
              styles.container,
              { backgroundColor },
              isMobile && [
                styles.mobileContainer,
                {
                  paddingBottom: bottom + spacing.md,
                  borderTopColor: borderColor,
                  ...(drawerHeight !== undefined ? { height: drawerHeight } : null),
                },
              ],
            ]}
          >
            {isMobile ? (
              <View
                style={styles.mobileHandleContainer}
                testID="post-composer-handle"
                accessibilityRole="adjustable"
                accessibilityLabel={t('common.handle')}
                hitSlop={{ top: 12, bottom: 12, left: 24, right: 24 }}
                {...handlePanResponder.panHandlers}
              >
                <View style={[styles.mobileHandle, { backgroundColor: drawerHandleColor }]} />
              </View>
            ) : null}
            {/* Header */}
            <View
              style={[
                styles.header,
                {
                  borderBottomColor: borderColor,
                  paddingHorizontal: drawerPaddingHorizontal,
                  paddingVertical: drawerHeaderVerticalPadding,
                },
              ]}
            >
              <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
                <ThemedText style={[styles.headerButtonText, { color: iconColor }]}>{t('common.cancel')}</ThemedText>
              </TouchableOpacity>

              <ThemedText type="defaultSemiBold" style={[styles.headerTitle, { color: textColor }]}>
                {replyTo ? t('post.reply') : t('post.newPost')}
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
                    paddingHorizontal: drawerPaddingHorizontal,
                    paddingVertical: drawerHeaderVerticalPadding,
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
              {/* Text Input */}
              <View
                style={[
                  styles.inputContainer,
                  {
                    paddingHorizontal: drawerPaddingHorizontal,
                    paddingVertical: drawerInputVerticalPadding,
                  },
                ]}
              >
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      color: textColor,
                      minHeight: drawerTextMinHeight,
                    },
                    Platform.OS === 'web' && { outline: 'none' },
                  ]}
                  value={text}
                  onChangeText={setText}
                  placeholder={replyTo ? t('post.replyPlaceholder') : t('post.postPlaceholder')}
                  placeholderTextColor={iconColor}
                  multiline
                  autoFocus
                  maxLength={maxCharacters}
                  textAlignVertical="top"
                  selectionColor={tintColor}
                  cursorColor={tintColor}
                />
              </View>

              {/* Attached Images */}
              {attachedImages.length > 0 && (
                <View
                  style={[
                    styles.imagesContainer,
                    {
                      paddingHorizontal: drawerPaddingHorizontal,
                    },
                  ]}
                >
                  {attachedImages.map((image, index) => (
                    <View key={index} style={styles.imageItem}>
                      <View style={styles.imageContainer}>
                        <Image source={{ uri: image.uri }} style={styles.attachedImage} contentFit="contain" />
                        <TouchableOpacity style={styles.removeImageButton} onPress={() => handleRemoveImage(index)} testID={`remove-image-${index}`}>
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
                  paddingHorizontal: drawerPaddingHorizontal,
                  paddingVertical: drawerFooterVerticalPadding,
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
        </ThemedView>
      </KeyboardAvoidingView>

      {/* GIF Picker Modal */}
      <GifPicker visible={gifPickerVisible} onClose={() => setGifPickerVisible(false)} onSelectGif={handleSelectGif} />
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    position: 'relative',
  },
  mobileOverlay: {
    justifyContent: 'flex-end',
  },
  backdropPressable: {
    zIndex: 1,
  },
  container: {
    margin: spacing.xl,
    minHeight: 300,
    maxHeight: '80%',
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
    ...shadows.lg,
    zIndex: 2,
    position: 'relative',
  },
  mobileContainer: {
    margin: 0,
    maxWidth: '100%',
    width: '100%',
    alignSelf: 'stretch',
    borderTopLeftRadius: spacing.xxl,
    borderTopRightRadius: spacing.xxl,
    borderTopWidth: StyleSheet.hairlineWidth,
    maxHeight: '90%',
    position: 'relative',
  },
  mobileHandleContainer: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: spacing.xxs,
  },
  mobileHandle: {
    width: spacing.xxxxl,
    height: spacing.xs,
    borderRadius: spacing.xxs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: layout.hairline,
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
  inputContainer: {},
  textInput: {
    fontSize: 18,
    lineHeight: 26,
    textAlignVertical: 'top',
  },
  imagesContainer: {
    paddingBottom: spacing.xl,
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
  removeImageText: {
    color: '#FFFFFF',
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
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
