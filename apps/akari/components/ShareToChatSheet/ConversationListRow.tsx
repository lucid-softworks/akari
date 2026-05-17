import { memo, useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Image } from '@/components/Image';
import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { activeOpacity, fontSize, fontWeight, spacing } from '@/constants/tokens';

import type { ConversationRow } from './types';

type ConversationListRowProps = {
  item: ConversationRow;
  checked: boolean;
  onToggle: (convo: ConversationRow) => void;
  borderColor: string;
  textColor: string;
  iconColor: string;
  tintColor: string;
};

/**
 * One row in the share-to-chat conversation list. Memoized because the
 * FlatList holds it stable across re-renders triggered by selection
 * toggles on sibling rows.
 */
export const ConversationListRow = memo(function ConversationListRow({
  item,
  checked,
  onToggle,
  borderColor,
  textColor,
  iconColor,
  tintColor,
}: ConversationListRowProps) {
  const avatarSource = useMemo(
    () => (item.avatar ? { uri: item.avatar } : undefined),
    [item.avatar],
  );
  const handlePress = useCallback(() => onToggle(item), [onToggle, item]);
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && { opacity: activeOpacity.default }]}
      onPress={handlePress}
    >
      {avatarSource ? (
        <Image source={avatarSource} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, { backgroundColor: borderColor }]} />
      )}
      <View style={styles.rowText}>
        <ThemedText style={[styles.displayName, { color: textColor }]} numberOfLines={1}>
          {item.displayName}
        </ThemedText>
        <ThemedText style={[styles.handle, { color: iconColor }]} numberOfLines={1}>
          @{item.handle}
        </ThemedText>
      </View>
      <IconSymbol
        name={checked ? 'checkmark.circle.fill' : 'circle'}
        size={22}
        color={checked ? tintColor : iconColor}
      />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  rowText: { flex: 1 },
  displayName: { fontSize: fontSize.base, fontWeight: fontWeight.medium },
  handle: { fontSize: fontSize.sm, marginTop: 2 },
});
