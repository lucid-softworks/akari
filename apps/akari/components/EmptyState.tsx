import type { ReactNode } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { fontSize, fontWeight, opacity, radius, spacing } from '@/constants/tokens';
import { useThemeColor } from '@/hooks/useThemeColor';

type EmptyStateAction = {
  label: string;
  onPress: () => void;
};

type EmptyStateProps = {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: EmptyStateAction;
  testID?: string;
};

export function EmptyState({ title, subtitle, icon, action, testID }: EmptyStateProps) {
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');

  return (
    <ThemedView style={styles.container} testID={testID}>
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <ThemedText style={[styles.title, { color: textColor }]}>{title}</ThemedText>
      {subtitle ? (
        <ThemedText style={[styles.subtitle, { color: textColor }]}>{subtitle}</ThemedText>
      ) : null}
      {action ? (
        <TouchableOpacity
          accessibilityRole="button"
          onPress={action.onPress}
          style={[styles.action, { borderColor: tintColor }]}
        >
          <ThemedText style={[styles.actionLabel, { color: tintColor }]}>{action.label}</ThemedText>
        </TouchableOpacity>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxxl,
    paddingVertical: spacing.xxxxl,
    gap: spacing.sm,
  },
  icon: {
    marginBottom: spacing.md,
    opacity: opacity.tertiary,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize.lg,
    opacity: opacity.tertiary,
    textAlign: 'center',
    lineHeight: 22,
  },
  action: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  actionLabel: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
});
