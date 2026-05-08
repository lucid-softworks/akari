import { Image } from '@/components/Image';
import { useState } from 'react';
import { Modal, Platform, Pressable, Share, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { spacing, fontSize, fontWeight, touchTarget } from '@/constants/tokens';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { showAlert } from '@/utils/alert';

type ImageViewerProps = {
  visible: boolean;
  onClose: () => void;
  imageUrl: string;
  altText?: string;
};

export function ImageViewer({ visible, onClose, imageUrl, altText }: ImageViewerProps) {
  const { t } = useTranslation();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const backgroundColor = useThemeColor(
    {
      light: '#000000',
      dark: '#000000',
    },
    'background',
  );

  const textColor = useThemeColor(
    {
      light: '#ffffff',
      dark: '#ffffff',
    },
    'text',
  );

  // Pinch gesture
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((event) => {
      scale.value = savedScale.value * event.scale;
    })
    .onEnd(() => {
      if (scale.value < 1) {
        scale.value = withSpring(1);
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
      savedScale.value = scale.value;
    });

  // Pan gesture
  const panGesture = Gesture.Pan()
    .onStart(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((event) => {
      if (scale.value > 1) {
        translateX.value = savedTranslateX.value + event.translationX;
        translateY.value = savedTranslateY.value + event.translationY;
      }
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  // Combine gestures
  const gesture = Gesture.Simultaneous(pinchGesture, panGesture);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }, { translateY: translateY.value }, { scale: scale.value }],
    };
  });

  // Reset states when modal opens/closes
  const handleClose = () => {
    scale.value = withSpring(1);
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
    setImageLoaded(false);
    setImageError(false);
    onClose();
  };

  const handleDownload = async () => {
    try {
      if (Platform.OS === 'web') {
        // For web, create a download link
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = 'image.jpg';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // For mobile, use Share API
        await Share.share({
          url: imageUrl,
          message: t('common.checkOutImage'),
        });
      }
    } catch {
      showAlert({
        title: t('common.error'),
        message: t('common.failedToDownloadImage'),
      });
    }
  };

  const handleDoubleTap = () => {
    if (scale.value > 1) {
      scale.value = withSpring(1);
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
    } else {
      scale.value = withSpring(2);
    }
  };

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={handleClose}>
      <View style={[styles.container, { backgroundColor }]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={handleClose} style={({ pressed }) => [styles.closeButton, pressed && { opacity: 0.7 }]} testID="close-button">
            <IconSymbol name="xmark" size={24} color={textColor} />
          </Pressable>

          <Pressable onPress={handleDownload} style={({ pressed }) => [styles.downloadButton, pressed && { opacity: 0.7 }]} testID="download-button">
            <IconSymbol name="square.and.arrow.up" size={20} color={textColor} />
          </Pressable>
        </View>

        {/* Image Container */}
        <View style={styles.imageContainer}>
          <GestureDetector gesture={gesture}>
            <Animated.View style={[styles.imageWrapper, animatedStyle]}>
              <Pressable
                onPress={handleClose}
                onLongPress={handleDoubleTap}
                testID="image-touchable"
                style={({ pressed }) => [styles.imageTouchable, pressed && { opacity: 1 }]}
              >
                <Image
                  source={{ uri: imageUrl }}
                  style={styles.image}
                  contentFit="contain"
                  onLoad={() => setImageLoaded(true)}
                  onError={() => setImageError(true)}
                />
              </Pressable>
            </Animated.View>
          </GestureDetector>
        </View>

        {/* Alt Text */}
        {altText && (
          <View style={styles.altTextContainer}>
            <ThemedText style={[styles.altText, { color: textColor }]}>{altText}</ThemedText>
          </View>
        )}

        {/* Loading/Error States */}
        {!imageLoaded && !imageError && (
          <View style={styles.centerContainer}>
            <ThemedText style={[styles.loadingText, { color: textColor }]}>{t('common.loading')}</ThemedText>
          </View>
        )}

        {imageError && (
          <View style={styles.centerContainer}>
            <ThemedText style={[styles.errorText, { color: textColor }]}>{t('common.failedToLoadImage')}</ThemedText>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: 60,
    paddingBottom: spacing.xl,
  },
  closeButton: {
    width: touchTarget.min,
    height: touchTarget.min,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.semibold,
  },
  downloadButton: {
    width: touchTarget.min,
    height: touchTarget.min,
    justifyContent: 'center',
    alignItems: 'center',
  },
  downloadText: {
    fontSize: fontSize.xxl,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageWrapper: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageTouchable: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  altTextContainer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxxl,
  },
  altText: {
    fontSize: fontSize.lg,
    lineHeight: 24,
    textAlign: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
  },
  errorText: {
    fontSize: 18,
  },

});
