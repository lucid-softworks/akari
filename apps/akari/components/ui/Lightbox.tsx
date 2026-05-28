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
   * Multi-image gallery. When provided alongside `startIndex`, the
   * lightbox renders a horizontal pager and shows an "n / m" counter
   * in the top bar. Mutually exclusive with the legacy single-image
   * props below.
   */
  images?: LightboxImage[];
  startIndex?: number;
  /** Legacy single-image API. Kept for callers that haven't migrated. */
  imageUrl?: string;
  altText?: string;
};

const SWIPE_DOWN_CLOSE_THRESHOLD = 120;
const SWIPE_DOWN_VELOCITY_THRESHOLD = 800;
const DOUBLE_TAP_ZOOM = 2.5;
const CHROME_FG = '#ffffff';
const CHROME_BG = hexToRgba('#000000', 0.45);

/**
 * Full-screen photo lightbox. Pager-style multi-image swipe, real
 * double-tap-to-zoom, pinch-and-pan when zoomed, swipe-down-to-dismiss
 * with progressive backdrop fade, and an auto-hiding chrome layer so
 * the photo can breathe once the user starts interacting.
 *
 * The legacy `ImageViewer` import path still re-exports `Lightbox` for
 * back-compat — see `components/ImageViewer.tsx`.
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

  // Drives the backdrop alpha (dimmer as the user drags to dismiss) and
  // the vertical offset on the entire scene. Stays at 1/0 unless the
  // user is actively swiping down.
  const backdropOpacity = useSharedValue(1);
  const dismissTranslateY = useSharedValue(0);
  // Tapping anywhere on the chrome-less area toggles the chrome (header
  // + alt-text footer). Always visible on first open; fades out when
  // the user starts panning / zooming.
  const chromeOpacity = useSharedValue(1);

  const setChromeVisible = useCallback((visibleFlag: boolean) => {
    chromeOpacity.value = withTiming(visibleFlag ? 1 : 0, { duration: 160 });
  }, [chromeOpacity]);

  const closeAndReset = useCallback(() => {
    dismissTranslateY.value = 0;
    backdropOpacity.value = 1;
    chromeOpacity.value = 1;
    onClose();
  }, [backdropOpacity, chromeOpacity, dismissTranslateY, onClose]);

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
    backgroundColor: `rgba(0, 0, 0, ${backdropOpacity.value})`,
    transform: [{ translateY: dismissTranslateY.value }],
  }));

  const chromeStyle = useAnimatedStyle(() => ({
    opacity: chromeOpacity.value,
  }));

  const renderItem = useCallback<ListRenderItem<LightboxImage>>(
    ({ item }) => (
      <ZoomableImage
        image={item}
        screenW={screenW}
        screenH={screenH}
        dismissTranslateY={dismissTranslateY}
        backdropOpacity={backdropOpacity}
        onDismiss={closeAndReset}
        onChromeShouldHide={() => setChromeVisible(false)}
      />
    ),
    [backdropOpacity, closeAndReset, dismissTranslateY, screenH, screenW, setChromeVisible],
  );

  const keyExtractor = useCallback((item: LightboxImage, i: number) => `${i}-${item.url}`, []);
  const getItemLayout = useCallback<NonNullable<FlatListProps<LightboxImage>['getItemLayout']>>(
    (_data, index) => ({ length: screenW, offset: screenW * index, index }),
    [screenW],
  );

  if (items.length === 0) return null;
  const altForCurrent = items[currentIndex]?.alt;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={closeAndReset}>
      <Animated.View style={[styles.container, sceneStyle]}>
        <Animated.View
          style={[styles.header, { paddingTop: insets.top + spacing.sm }, chromeStyle]}
          pointerEvents="box-none"
        >
          <Pressable
            onPress={closeAndReset}
            style={({ pressed }) => [styles.chromeButton, pressed && { opacity: 0.75 }]}
            testID="close-button"
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
            hitSlop={8}
          >
            <IconSymbol name="xmark" size={18} color={CHROME_FG} />
          </Pressable>

          {items.length > 1 ? (
            <View style={styles.counterPill}>
              <ThemedText style={styles.counterText}>
                {`${currentIndex + 1} / ${items.length}`}
              </ThemedText>
            </View>
          ) : (
            <View />
          )}

          <Pressable
            onPress={handleDownload}
            style={({ pressed }) => [styles.chromeButton, pressed && { opacity: 0.75 }]}
            testID="download-button"
            accessibilityRole="button"
            accessibilityLabel={t('common.share')}
            hitSlop={8}
          >
            <IconSymbol name="square.and.arrow.up" size={18} color={CHROME_FG} />
          </Pressable>
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

        {altForCurrent ? (
          <Animated.View
            style={[
              styles.altTextContainer,
              { paddingBottom: insets.bottom + spacing.lg },
              chromeStyle,
            ]}
            pointerEvents="none"
          >
            <ThemedText style={styles.altText} numberOfLines={4}>
              {altForCurrent}
            </ThemedText>
          </Animated.View>
        ) : null}
      </Animated.View>
    </Modal>
  );
}

type ZoomableImageProps = {
  image: LightboxImage;
  screenW: number;
  screenH: number;
  dismissTranslateY: SharedValue<number>;
  backdropOpacity: SharedValue<number>;
  onDismiss: () => void;
  onChromeShouldHide: () => void;
};

function ZoomableImage({
  image,
  screenW,
  screenH,
  dismissTranslateY,
  backdropOpacity,
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
        // Pan inside the zoomed image.
        translateX.value = savedTranslateX.value + event.translationX;
        translateY.value = savedTranslateY.value + event.translationY;
      } else if (Math.abs(event.translationY) > Math.abs(event.translationX)) {
        // Swipe-down-to-dismiss. Only catch vertical so the FlatList
        // still owns horizontal pages.
        const dy = Math.max(0, event.translationY);
        dismissTranslateY.value = dy;
        backdropOpacity.value = interpolate(
          dy,
          [0, SWIPE_DOWN_CLOSE_THRESHOLD * 2],
          [1, 0],
          Extrapolation.CLAMP,
        );
        if (dy > 8) runOnJS(onChromeShouldHide)();
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
        dismissTranslateY.value = withTiming(screenH, { duration: 180 });
        backdropOpacity.value = withTiming(0, { duration: 180 }, () => {
          runOnJS(onDismiss)();
        });
      } else {
        dismissTranslateY.value = withSpring(0);
        backdropOpacity.value = withSpring(1);
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
    backgroundColor: CHROME_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: CHROME_BG,
  },
  counterText: {
    color: CHROME_FG,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
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
  altTextContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    backgroundColor: hexToRgba('#000000', 0.55),
  },
  altText: {
    fontSize: fontSize.base,
    lineHeight: 22,
    textAlign: 'center',
    color: CHROME_FG,
  },
});
