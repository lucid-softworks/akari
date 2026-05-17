import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { fontSize, fontWeight, layout, spacing } from '@/constants/tokens';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

type SheetHeaderProps = {
  step: 'pick' | 'compose';
  onBack: () => void;
  onDismiss: () => void;
};

/**
 * Sticky header for the share-to-chat sheet. Shows a Back button in
 * the compose step and Cancel on both steps. The centered title comes
 * from the same translation key for both steps.
 */
export function SheetHeader({ step, onBack, onDismiss }: SheetHeaderProps) {
  const { t } = useTranslation();
  const borderColor = useThemeColor({}, 'border');
  const iconColor = useThemeColor({ light: '#687076', dark: '#9BA1A6' }, 'text');
  const textColor = useThemeColor({}, 'text');

  return (
    <View style={[styles.header, { borderBottomColor: borderColor }]}>
      <View style={styles.headerSide}>
        {step === 'compose' ? (
          <Pressable onPress={onBack} hitSlop={12} style={({ pressed }) => pressed && { opacity: 0.7 }}>
            <ThemedText style={[styles.headerAction, { color: iconColor }]}>
              {t('common.back')}
            </ThemedText>
          </Pressable>
        ) : null}
      </View>
      <ThemedText style={[styles.headerTitle, { color: textColor }]}>
        {t('post.share.sendToChat')}
      </ThemedText>
      <View style={styles.headerSide}>
        <Pressable onPress={onDismiss} hitSlop={12} style={({ pressed }) => pressed && { opacity: 0.7 }}>
          <ThemedText style={[styles.headerAction, { color: iconColor }]}>
            {t('common.cancel')}
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: layout.hairline,
  },
  headerSide: { minWidth: 60 },
  headerTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, flex: 1, textAlign: 'center' },
  headerAction: { fontSize: fontSize.lg },
});
