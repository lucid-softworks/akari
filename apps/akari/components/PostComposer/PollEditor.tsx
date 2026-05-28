import { Pressable, StyleSheet, View } from 'react-native';

import { PollFields } from '@/components/PollFields';
import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { fontSize, fontWeight, hitSlop, spacing } from '@/constants/tokens';
import { useTranslation } from '@/hooks/useTranslation';
import type { PollDraft } from '@/utils/postComposer/types';

type PollEditorProps = {
  poll: PollDraft;
  onChange: (next: PollDraft | null) => void;
  textColor: string;
  iconColor: string;
};

/**
 * Inline poll editor rendered inside the composer's content area when a poll
 * is attached. Mirrors the previous inline JSX one-for-one.
 */
export function PollEditor({ poll, onChange, textColor, iconColor }: PollEditorProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.pollSection}>
      <View style={styles.pollHeader}>
        <ThemedText style={[styles.pollTitle, { color: textColor }]}>{t('poll.newPoll')}</ThemedText>
        <Pressable onPress={() => onChange(null)} hitSlop={hitSlop} accessibilityRole="button" accessibilityLabel={t('common.cancel')}>
          <IconSymbol name="xmark" size={16} color={iconColor} />
        </Pressable>
      </View>
      <PollFields
        options={poll.options}
        onChangeOptions={(options) => onChange({ ...poll, options })}
        durationHours={poll.durationHours}
        onChangeDuration={(durationHours) => onChange({ ...poll, durationHours })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  pollSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  pollHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pollTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
});
