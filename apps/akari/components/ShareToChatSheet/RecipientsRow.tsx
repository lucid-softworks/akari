import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Image } from '@/components/Image';
import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { fontSize, fontWeight, layout, radius, spacing } from '@/constants/tokens';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

import type { ConversationRow } from './types';

type RecipientsRowProps = {
  selected: ConversationRow[];
  onRemove: (convo: ConversationRow) => void;
};

/**
 * Horizontally-scrollable chip strip showing the currently selected
 * recipients in the compose step. Tapping a chip's X removes that
 * recipient from the selection.
 */
export function RecipientsRow({ selected, onRemove }: RecipientsRowProps) {
  const { t } = useTranslation();
  const borderColor = useThemeColor({}, 'border');
  const iconColor = useThemeColor({ light: '#687076', dark: '#9BA1A6' }, 'text');
  const textColor = useThemeColor({}, 'text');

  return (
    <View style={[styles.recipientsRow, { borderBottomColor: borderColor }]}>
      <ThemedText style={[styles.recipientsLabel, { color: iconColor }]}>
        {t('post.share.toLabel')}
      </ThemedText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.recipientsChips}
      >
        {/* oxlint-disable-next-line react-doctor/rn-no-scrollview-mapped-list -- Bounded selected-recipients chip row (user picks a handful), virtualization overhead > scan cost */}
        {selected.map((c) => (
          <View key={c.convoId} style={[styles.chip, { borderColor }]}>
            {c.avatar ? (
              <Image source={{ uri: c.avatar }} style={styles.chipAvatar} />
            ) : (
              <View style={[styles.chipAvatar, { backgroundColor: borderColor }]} />
            )}
            <ThemedText
              style={[styles.chipText, { color: textColor }]}
              numberOfLines={1}
            >
              {c.displayName}
            </ThemedText>
            <Pressable onPress={() => onRemove(c)} hitSlop={6} style={({ pressed }) => pressed && { opacity: 0.7 }}>
              <IconSymbol name="xmark" size={12} color={iconColor} />
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  recipientsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: layout.hairline,
  },
  recipientsLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  recipientsChips: { gap: spacing.xs, paddingRight: spacing.md, alignItems: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: layout.hairline,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    maxWidth: 180,
  },
  chipAvatar: { width: 18, height: 18, borderRadius: 9 },
  chipText: { fontSize: fontSize.sm },
});
