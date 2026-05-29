import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { fontSize, fontWeight, radius, spacing } from '@/constants/tokens';
import { useTranslation } from '@/hooks/useTranslation';

/** Cancel + Submit footer; Submit goes red when the action is destructive. */
export function SheetFooter({
  onCancel,
  onSubmit,
  isPending,
  isDestructive,
  borderColor,
  tint,
  dangerColor,
}: {
  onCancel: () => void;
  onSubmit: () => void;
  isPending: boolean;
  isDestructive: boolean;
  borderColor: string;
  tint: string;
  dangerColor: string;
}) {
  const { t } = useTranslation();
  return (
    <View style={[styles.footer, { borderTopColor: borderColor }]}>
      <Pressable onPress={onCancel} style={[styles.footerButton, { borderColor }]} disabled={isPending}>
        <ThemedText style={styles.footerButtonLabel}>{t('moderation.actionSheet.cancel')}</ThemedText>
      </Pressable>
      <Pressable
        onPress={onSubmit}
        disabled={isPending}
        style={[
          styles.footerButton,
          styles.footerButtonPrimary,
          { backgroundColor: isDestructive ? dangerColor : tint },
          isPending && { opacity: 0.6 },
        ]}
      >
        <ThemedText style={[styles.footerButtonLabel, styles.footerButtonLabelPrimary]}>
          {isPending ? 'Submitting…' : 'Submit'}
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderTopWidth: 1,
  },
  footerButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerButtonPrimary: {
    borderColor: 'transparent',
  },
  footerButtonLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  footerButtonLabelPrimary: {
    color: '#ffffff',
  },
});
