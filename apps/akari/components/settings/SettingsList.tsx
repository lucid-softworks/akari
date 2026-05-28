import React from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useThemeColor } from '@/hooks/useThemeColor';

export type SettingsRowDescriptor = {
  // Used as React list key when rendering an array of rows; not needed
  // when SettingsRow is rendered directly as a child element.
  key?: string;
  icon?: React.ComponentProps<typeof IconSymbol>['name'];
  label: string;
  description?: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
};

type SettingsSectionProps = {
  title?: string;
  children: React.ReactNode;
  isFirst?: boolean;
};

type SettingsRowProps = SettingsRowDescriptor & {
  borderColor: string;
  showDivider?: boolean;
};

export function SettingsSection({ children, isFirst = false, title }: SettingsSectionProps) {
  // Section spacing is owned by the parent scroll container (`gap` on
  // `SettingsScroll`'s contentContainerStyle); the section itself just
  // stacks its title and body with a small internal gap. The `isFirst`
  // prop is kept for API back-compat — historically it tightened the
  // top margin on the very first section — but is now a no-op because
  // the parent gap doesn't trigger before the first child.
  void isFirst;
  return (
    <ThemedView style={styles.section}>
      {title ? <ThemedText style={styles.sectionTitle}>{title}</ThemedText> : null}
      {children}
    </ThemedView>
  );
}

export function SettingsRow({
  borderColor,
  description,
  destructive = false,
  icon,
  label,
  onPress,
  showDivider = true,
  value,
}: SettingsRowProps) {
  const iconColor = useThemeColor({}, 'text');
  const chevronColor = useThemeColor(
    { light: 'rgba(17, 24, 39, 0.35)', dark: 'rgba(255, 255, 255, 0.35)' },
    'text',
  );

  const rowContent = (
    <>
      {icon ? <IconSymbol color={iconColor} name={icon} size={20} style={styles.rowIcon} /> : null}
      <ThemedView style={styles.rowContent}>
        <ThemedText style={[styles.rowLabel, destructive && styles.rowLabelDestructive]}>{label}</ThemedText>
        {description ? (
          <ThemedText
            darkColor="rgba(255, 255, 255, 0.6)"
            lightColor="rgba(17, 24, 39, 0.6)"
            style={styles.rowDescription}
          >
            {description}
          </ThemedText>
        ) : null}
      </ThemedView>
      {value ? (
        <ThemedText
          darkColor="rgba(255, 255, 255, 0.75)"
          lightColor="rgba(17, 24, 39, 0.75)"
          numberOfLines={1}
          style={styles.rowValue}
        >
          {value}
        </ThemedText>
      ) : null}
      {onPress ? <IconSymbol color={chevronColor} name="chevron.right" size={18} /> : null}
    </>
  );

  const rowStyle = [
    styles.row,
    showDivider ? { borderBottomColor: borderColor, borderBottomWidth: StyleSheet.hairlineWidth } : styles.rowLast,
  ];

  if (onPress) {
    return (
      <Pressable accessibilityRole="button"  onPress={onPress} style={({ pressed }) => [rowStyle, pressed && { opacity: 0.7 }]}>
        {rowContent}
      </Pressable>
    );
  }

  return <ThemedView style={rowStyle}>{rowContent}</ThemedView>;
}

const styles = StyleSheet.create({
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.65,
    paddingHorizontal: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowIcon: {
    marginRight: 12,
  },
  rowContent: {
    flex: 1,
    gap: 4,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  rowLabelDestructive: {
    color: '#DC2626',
  },
  rowDescription: {
    fontSize: 13,
  },
  rowValue: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 12,
    maxWidth: 140,
  },
});

