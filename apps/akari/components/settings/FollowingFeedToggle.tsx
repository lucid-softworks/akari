import { StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { fontSize, fontWeight, layout, spacing } from '@/constants/tokens';

export function FollowingFeedToggle({
  label,
  value,
  onChange,
  borderColor,
  textColor,
}: {
  label: string;
  value: boolean;
  onChange: (next: boolean) => void;
  borderColor: string;
  textColor: string;
}) {
  return (
    <View style={[styles.toggleRow, { borderBottomColor: borderColor, borderBottomWidth: layout.hairline }]}>
      <ThemedText style={[styles.toggleLabel, { color: textColor }]}>{label}</ThemedText>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  toggleLabel: {
    flex: 1,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
});
