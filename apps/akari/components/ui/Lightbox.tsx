import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  type FlatListProps,
  type ListRenderItem,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Image } from '@/components/Image';
import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Modal } from '@/components/ui/Modal';
import { fontSize, fontWeight, hexToRgba, radius, spacing } from '@/constants/tokens';
import { useConfirm } from '@/hooks/useConfirm';
import { useTranslation } from '@/hooks/useTranslation';

export type LightboxImage = { url: string; alt?: string };

type LightboxProps = {
  visible: boolean;
  onClose: () => void;
  /**
   * Multi-image gallery. The lightbox renders a horizontal pager and a
   * pagination dot row at the bottom. Mutually exclusive with the
   * single-image props below.
   */
  images?: LightboxImage[];
  startIndex?: number;
  /** Single-image API for callers that don't have a gallery. */
  imageUrl?: string;
  altText?: string;
};

const SWIPE_DOWN_CLOSE_THRESHOLD = 120;
const SWIPE_DOWN_VELOCITY_THRESHOLD = 800;
const DOUBLE_TAP_ZOOM = 2.5;
const CHROME_FG = '#ffffff';
const CHROME_TINT_BG = hexToRgba('#000000', 0.35);

/**
 * Full-screen photo lightbox. Pager-style multi-image swipe, real
 * double-tap-to-zoom, pinch-and-pan when zoomed, swipe-down-to-dismiss
 * with progressive backdrop fade, plus a glassmorphic chrome layer
 * (blurred close / share buttons, pagination dots, alt-text card) that
 * auto-hides as soon as the user starts interacting with the photo.
 */
export function Lightbox({
  visible,
  onClose,
  images,
  startIndex = 0,
  imageUrl,
  altText,
}: LightboxProps) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const insets = useSafeAreaInsets();
  const { width: screenW, height: screenH } = Dimensions.get('window');

  const items = useMemo<LightboxImage[]>(() => {
    if (images && images.length > 0) return images;
    if (imageUrl) return [{ url: imageUrl, alt: altText }];
    return [];
  }, [images, imageUrl, altText]);

  const [currentIndex, setCurrentIndex] = useState(startIndex);
  useEffect(() => {
    if (visible) setCurrentIndex(startIndex);
  }, [visible, startIndex]);

  // Backdrop opacity dims as the user swipes down to dismiss. Chrome
  // opacity fades the header + footer as soon as the user pinches or
  // pans so nothing covers the photo they're focused on. No scale
  // animation on the scene — it felt bouncy and out of place; a clean
  // fade matches the rest of the app's modal transitions.
  const backdropOpacity = useSharedValue(0);
  const dismissTranslateY = useSharedValue(0);
  const chromeOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      backdropOpacity.value = withTiming(1, { duration: 180 });
      chromeOpacity.value = withTiming(1, { duration: 220 });
    } else {
      backdropOpacity.value = 0;
      chromeOpacity.value = 0;
      dismissTranslateY.value = 0;
    }
  }, [visible, backdropOpacity, chromeOpacity, dismissTranslateY]);

  const setChromeVisible = useCallback(
    (next: boolean) => {
      chromeOpacity.value = withTiming(next ? 1 : 0, { duration: 160 });
    },
    [chromeOpacity],
  );

  const closeAndReset = useCallback(() => {
    onClose();
  }, [onClose]);

  // Web keyboard support: Escape closes, arrow keys page.
  const listRef = useRef<FlatList<LightboxImage>>(null);
  useEffect(() => {
    if (!visible || Platform.OS !== 'web' || typeof window === 'undefined') return;
    const handle = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeAndReset();
      } else if (event.key === 'ArrowRight' && currentIndex < items.length - 1) {
        listRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
      } else if (event.key === 'ArrowLeft' && currentIndex > 0) {
        listRef.current?.scrollToIndex({ index: currentIndex - 1, animated: true });
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [visible, closeAndReset, currentIndex, items.length]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const idx = Math.round(event.nativeEvent.contentOffset.x / screenW);
      if (idx !== currentIndex && idx >= 0 && idx < items.length) {
        setCurrentIndex(idx);
      }
    },
    [currentIndex, items.length, screenW],
  );

  const handleDownload = useCallback(async () => {
    const url = items[currentIndex]?.url;
    if (!url) return;
    try {
      if (Platform.OS === 'web') {
        const link = document.createElement('a');
        link.href = url;
        link.download = 'image.jpg';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        await Share.share({ url, message: t('common.checkOutImage') });
      }
    } catch {
      confirm({
        title: t('common.error'),
        message: t('common.failedToDownloadImage'),
        buttons: [{ text: t('common.ok') }],
      });
    }
  }, [confirm, currentIndex, items, t]);

  const sceneStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: dismissTranslateY.value }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));
  const chromeStyle = useAnimatedStyle(() => ({ opacity: chromeOpacity.value }));

  const renderItem = useCallback<ListRenderItem<LightboxImage>>(
    ({ item }) => (
      <ZoomableImage
        image={item}
        screenW={screenW}
        screenH={screenH}
        dismissTranslateY={dismissTranslateY}
        backdropOpacity={backdropOpacity}
        chromeOpacity={chromeOpacity}
        onDismiss={closeAndReset}
        onChromeShouldHide={() => setChromeVisible(false)}
      />
    ),
    [
      backdropOpacity,
      chromeOpacity,
      closeAndReset,
      dismissTranslateY,
      screenH,
      screenW,
      setChromeVisible,
    ],
  );

  const keyExtractor = useCallback((item: LightboxImage, i: number) => `${i}-${item.url}`, []);
  const getItemLayout = useCallback<NonNullable<FlatListProps<LightboxImage>['getItemLayout']>>(
    (_data, index) => ({ length: screenW, offset: screenW * index, index }),
    [screenW],
  );

  if (items.length === 0) return null;
  const altForCurrent = items[currentIndex]?.alt;
  const isMulti = items.length > 1;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={closeAndReset}>
      <View style={styles.container}>
        <Animated.View style={[styles.backdrop, backdropStyle]} pointerEvents="none" />

        <Animated.View style={[styles.scene, sceneStyle]}>
          {/* Header chrome — close + share as blurred circles. The counter
              moved out of the header for a cleaner top bar; pagination
              dots sit at the bottom for multi-image. */}
          <Animated.View
            style={[styles.header, { paddingTop: insets.top + spacing.sm }, chromeStyle]}
            pointerEvents="box-none"
          >
            <ChromeButton
              icon="xmark"
              testID="close-button"
              accessibilityLabel={t('common.close')}
              onPress={closeAndReset}
            />
            <ChromeButton
              icon="square.and.arrow.up"
              testID="download-button"
              accessibilityLabel={t('common.share')}
              onPress={handleDownload}
            />
          </Animated.View>

          <FlatList
            ref={listRef}
            data={items}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={startIndex}
            getItemLayout={getItemLayout}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            decelerationRate="fast"
            bounces={false}
          />

          {/* Web-only: prev / next chevrons. Touch platforms can swipe
              the pager directly; web users expect click targets. */}
          {Platform.OS === 'web' && isMulti ? (
            <Animated.View
              style={[styles.navOverlay, chromeStyle]}
              pointerEvents="box-none"
            >
              <NavChevron
                direction="prev"
                disabled={currentIndex === 0}
                onPress={() =>
                  listRef.current?.scrollToIndex({ index: currentIndex - 1, animated: true })
                }
              />
              <NavChevron
                direction="next"
                disabled={currentIndex === items.length - 1}
                onPress={() =>
                  listRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true })
                }
              />
            </Animated.View>
          ) : null}

          <Animated.View
            style={[
              styles.footer,
              { paddingBottom: insets.bottom + spacing.md },
              chromeStyle,
            ]}
            pointerEvents="box-none"
          >
            {altForCurrent ? (
              <View style={styles.altTextCard}>
                <ThemedText style={styles.altText} numberOfLines={4}>
                  {altForCurrent}
                </ThemedText>
              </View>
            ) : null}
            {isMulti ? (
              <View style={styles.dotsRow}>
                {items.map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      i === currentIndex && styles.dotActive,
                    ]}
                  />
                ))}
              </View>
            ) : null}
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
}

type ChromeButtonProps = {
  icon: Parameters<typeof IconSymbol>[0]['name'];
  onPress: () => void;
  accessibilityLabel: string;
  testID?: string;
};

function ChromeButton({ icon, onPress, accessibilityLabel, testID }: ChromeButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={12}
      style={({ pressed }) => [styles.chromeButton, pressed && { opacity: 0.7 }]}
    >
      <IconSymbol name={icon} size={20} color={CHROME_FG} style={styles.chromeIcon} />
    </Pressable>
  );
}

function NavChevron({
  direction,
  disabled,
  onPress,
}: {
  direction: 'prev' | 'next';
  disabled: boolean;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={t(direction === 'prev' ? 'common.previous' : 'common.next')}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.navChevron,
        direction === 'prev' ? styles.navChevronLeft : styles.navChevronRight,
        disabled && styles.navChevronDisabled,
        pressed && !disabled && { opacity: 0.7 },
      ]}
    >
      <IconSymbol
        name={direction === 'prev' ? 'chevron.left' : 'chevron.right'}
        size={20}
        color={CHROME_FG}
      />
    </Pressable>
  );
}

type ZoomableImageProps = {
  image: LightboxImage;
  screenW: number;
  screenH: number;
  dismissTranslateY: SharedValue<number>;
  backdropOpacity: SharedValue<number>;
  chromeOpacity: SharedValue<number>;
  onDismiss: () => void;
  onChromeShouldHide: () => void;
};

function ZoomableImage({
  image,
  screenW,
  screenH,
  dismissTranslateY,
  backdropOpacity,
  chromeOpacity,
  onDismiss,
  onChromeShouldHide,
}: ZoomableImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const { t } = useTranslation();

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const pinch = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value;
      runOnJS(onChromeShouldHide)();
    })
    .onUpdate((event) => {
      scale.value = Math.max(1, savedScale.value * event.scale);
    })
    .onEnd(() => {
      if (scale.value < 1) {
        scale.value = withSpring(1);
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
      savedScale.value = scale.value;
    });

  const pan = Gesture.Pan()
    .averageTouches(true)
    .onStart(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((event) => {
      if (scale.value > 1) {
        translateX.value = savedTranslateX.value + event.translationX;
        translateY.value = savedTranslateY.value + event.translationY;
      } else if (Math.abs(event.translationY) > Math.abs(event.translationX)) {
        // Plain drag-down dismiss: translateY follows the finger, the
        // backdrop fades 1:1 with distance, chrome fades out as soon
        // as the gesture commits.
        const dy = Math.max(0, event.translationY);
        dismissTranslateY.value = dy;
        backdropOpacity.value = interpolate(
          dy,
          [0, SWIPE_DOWN_CLOSE_THRESHOLD * 2],
          [1, 0],
          Extrapolation.CLAMP,
        );
        if (dy > 8) {
          chromeOpacity.value = interpolate(
            dy,
            [8, 80],
            [1, 0],
            Extrapolation.CLAMP,
          );
        }
      }
    })
    .onEnd((event) => {
      if (scale.value > 1) {
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
        return;
      }
      const shouldDismiss =
        dismissTranslateY.value > SWIPE_DOWN_CLOSE_THRESHOLD ||
        event.velocityY > SWIPE_DOWN_VELOCITY_THRESHOLD;
      if (shouldDismiss) {
        dismissTranslateY.value = withTiming(screenH, { duration: 160 });
        backdropOpacity.value = withTiming(0, { duration: 160 }, () => {
          runOnJS(onDismiss)();
        });
      } else {
        dismissTranslateY.value = withTiming(0, { duration: 180 });
        backdropOpacity.value = withTiming(1, { duration: 180 });
        chromeOpacity.value = withTiming(1, { duration: 180 });
      }
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1) {
        scale.value = withSpring(1);
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedScale.value = 1;
      } else {
        scale.value = withSpring(DOUBLE_TAP_ZOOM);
        savedScale.value = DOUBLE_TAP_ZOOM;
        runOnJS(onChromeShouldHide)();
      }
    });

  const singleTap = Gesture.Tap()
    .maxDuration(250)
    .requireExternalGestureToFail(doubleTap)
    .onEnd(() => {
      runOnJS(onDismiss)();
    });

  const composed = Gesture.Simultaneous(
    pinch,
    pan,
    Gesture.Exclusive(doubleTap, singleTap),
  );

  const imageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <View style={[styles.page, { width: screenW, height: screenH }]}>
      <GestureDetector gesture={composed}>
        <Animated.View style={[styles.imageWrapper, imageStyle]}>
          <Image
            source={{ uri: image.url }}
            style={styles.image}
            contentFit="contain"
            onLoad={() => setLoaded(true)}
            onError={() => setErrored(true)}
          />
        </Animated.View>
      </GestureDetector>

      {!loaded && !errored ? (
        <View pointerEvents="none" style={styles.centerOverlay}>
          <ActivityIndicator color={CHROME_FG} />
        </View>
      ) : null}
      {errored ? (
        <View pointerEvents="none" style={styles.centerOverlay}>
          <ThemedText style={styles.errorText}>
            {t('common.failedToLoadImage')}
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  scene: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
    zIndex: 2,
  },
  chromeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    // Soft dark fill — enough contrast to keep the white icon legible
    // against any photo without looking like a glassmorphic graft.
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  chromeIcon: {},
  navOverlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    zIndex: 2,
  },
  navChevron: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  navChevronLeft: {},
  navChevronRight: {},
  navChevronDisabled: { opacity: 0.25 },
  page: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageWrapper: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  centerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: CHROME_FG,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    alignItems: 'center',
    zIndex: 2,
  },
  altTextCard: {
    width: '100%',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  altText: {
    fontSize: fontSize.sm,
    lineHeight: 20,
    textAlign: 'center',
    color: CHROME_FG,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  dotActive: {
    width: 18,
    backgroundColor: '#ffffff',
  },
});
