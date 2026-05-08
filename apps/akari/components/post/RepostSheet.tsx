import React, { useCallback } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { spacing, radius, fontSize, fontWeight, layout, semanticColors } from '@/constants/tokens';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

type RepostSheetProps = {
  visible: boolean;
  isReposted: boolean;
  onDismiss: () => void;
  onRepostPress: () => void;
  onQuotePress: () => void;
};

export function RepostSheet({
  visible,
  isReposted,
  onDismiss,
  onRepostPress,
  onQuotePress,
}: RepostSheetProps) {
  const { t } = useTranslation();
  const { bottom } = useSafeAreaInsets();

  const sheetBg = useThemeColor({ light: '#ffffff', dark: '#1c1c1e' }, 'background');
  const borderColor = useThemeColor({}, 'border');
  const iconColor = useThemeColor({ light: '#687076', dark: '#9BA1A6' }, 'text');
  const textColor = useThemeColor({}, 'text');

  const handleRepost = useCallback(() => {
    onRepostPress();
    onDismiss();
  }, [onRepostPress, onDismiss]);

  const handleQuote = useCallback(() => {
    onQuotePress();
    onDismiss();
  }, [onQuotePress, onDismiss]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Pressable
          style={[
            styles.sheetWrapper,
            { paddingBottom: bottom + spacing.md },
          ]}
          onPress={(event) => event.stopPropagation()}
        >
          <ThemedView style={[styles.sheet, { backgroundColor: sheetBg, borderColor }]}>
            <Pressable
              style={({ pressed }) => [styles.option, pressed && { opacity: 0.7 }]}
              onPress={handleRepost}
              accessibilityRole="button"
              accessibilityLabel={isReposted ? t('post.undoRepost') : t('post.repostAction')}
            >
              <IconSymbol
                name="arrow.2.squarepath"
                size={22}
                color={isReposted ? semanticColors.repost : iconColor}
              />
              <ThemedText style={[styles.optionText, { color: textColor }]}>
                {isReposted ? t('post.undoRepost') : t('post.repostAction')}
              </ThemedText>
            </Pressable>
            <View style={[styles.divider, { backgroundColor: borderColor }]} />
            <Pressable
              style={({ pressed }) => [styles.option, pressed && { opacity: 0.7 }]}
              onPress={handleQuote}
              accessibilityRole="button"
              accessibilityLabel={t('post.quoteAction')}
            >
              <IconSymbol name="quote.bubble" size={22} color={iconColor} />
              <ThemedText style={[styles.optionText, { color: textColor }]}>
                {t('post.quoteAction')}
              </ThemedText>
            </Pressable>
          </ThemedView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheetWrapper: {
    paddingHorizontal: spacing.lg,
  },
  sheet: {
    borderRadius: radius.lg,
    borderWidth: layout.hairline,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        maxWidth: 420,
        alignSelf: 'center',
        width: '100%',
      },
      default: {},
    }),
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  optionText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
  },
  divider: {
    height: layout.hairline,
  },
});
