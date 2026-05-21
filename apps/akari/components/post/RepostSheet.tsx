import React, { useCallback, useEffect } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Modal } from '@/components/ui/Modal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { WebPortalDropdown, type WebPortalAnchorRect } from '@/components/post/WebPortalDropdown';
import { spacing, radius, fontSize, fontWeight, layout, semanticColors } from '@/constants/tokens';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

const WEB_REPOST_MENU_ESTIMATED_HEIGHT = 120;

type RepostSheetProps = {
  visible: boolean;
  isReposted: boolean;
  onDismiss: () => void;
  onRepostPress: () => void;
  onQuotePress: () => void;
  /**
   * Bounding rect of the repost button. Required on web to anchor the
   * portaled menu next to the button (matching the "..." menu). Native
   * ignores it and renders a bottom sheet instead.
   */
  anchorRect?: WebPortalAnchorRect | null;
};

export function RepostSheet({
  visible,
  isReposted,
  onDismiss,
  onRepostPress,
  onQuotePress,
  anchorRect,
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

  // On web, dismiss on any outside click. Mirrors PostActionsMenu's
  // pattern so the repost menu behaves like the "..." menu.
  useEffect(() => {
    if (Platform.OS !== 'web' || !visible) return;
    const handler = () => onDismiss();
    const id = requestAnimationFrame(() =>
      window.addEventListener('click', handler, { once: true }),
    );
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener('click', handler);
    };
  }, [visible, onDismiss]);

  const menuContent = (
    <>
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
    </>
  );

  if (Platform.OS === 'web') {
    return (
      <WebPortalDropdown
        visible={visible}
        anchorRect={anchorRect}
        estimatedHeight={WEB_REPOST_MENU_ESTIMATED_HEIGHT}
        onDismiss={onDismiss}
      >
        <ThemedView style={[styles.webDropdown, { backgroundColor: sheetBg, borderColor }]}>
          {menuContent}
        </ThemedView>
      </WebPortalDropdown>
    );
  }

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
            {menuContent}
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
  },
  webDropdown: {
    minWidth: 220,
    borderRadius: radius.md,
    borderWidth: layout.hairline,
    overflow: 'hidden',
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
