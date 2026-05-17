import React from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { fontSize, fontWeight, hitSlop, layout, radius, spacing } from '@/constants/tokens';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

type AppPasswordHelpModalProps = {
  visible: boolean;
  onClose: () => void;
};

export function AppPasswordHelpModal({ visible, onClose }: AppPasswordHelpModalProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const helperColor = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'text');
  const infoBorderColor = useThemeColor({ light: '#e1e5e9', dark: '#1F212D' }, 'border');
  const sheetBackgroundColor = useThemeColor({ light: '#ffffff', dark: '#1c1f24' }, 'background');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.helpBackdrop} onPress={onClose}>
        <Pressable
          style={[styles.helpSheetWrapper, { paddingBottom: insets.bottom + spacing.md }]}
          onPress={(e) => e.stopPropagation()}
        >
          <ThemedView
            style={[styles.helpSheet, { backgroundColor: sheetBackgroundColor, borderColor: infoBorderColor }]}
          >
            <View style={styles.helpSheetHeader}>
              <ThemedText style={styles.helpSheetTitle}>{t('auth.howToGetAppPassword')}</ThemedText>
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel={t('common.done')}
                hitSlop={hitSlop}
                style={({ pressed }) => pressed && { opacity: 0.7 }}
              >
                <IconSymbol name="xmark" size={20} color={helperColor} />
              </Pressable>
            </View>
            <ThemedText style={[styles.helpSheetBody, { color: helperColor }]}>
              {t('auth.appPasswordInstructions')}
            </ThemedText>
          </ThemedView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  helpBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  helpSheetWrapper: {
    paddingHorizontal: spacing.lg,
  },
  helpSheet: {
    borderRadius: radius.lg,
    borderWidth: layout.hairline,
    padding: spacing.lg,
    gap: spacing.md,
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
  helpSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  helpSheetTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  helpSheetBody: {
    fontSize: fontSize.base,
    lineHeight: 22,
  },
});
