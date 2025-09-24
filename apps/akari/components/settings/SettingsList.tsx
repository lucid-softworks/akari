import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useThemeColor } from '@/hooks/useThemeColor';

export type SettingsRowDescriptor = {
  key: string;
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
  return (
    <ThemedView style={[styles.section, isFirst && styles.firstSection]}>
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
      <TouchableOpacity accessibilityRole="button" activeOpacity={0.7} onPress={onPress} style={rowStyle}>
        {rowContent}
      </TouchableOpacity>
    );
  }

  return <ThemedView style={rowStyle}>{rowContent}</ThemedView>;
}

const styles = StyleSheet.create({
  section: {
    marginTop: 32,
  },
  firstSection: {
    marginTop: 24,
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
    marginTop: 4,
  },
  rowValue: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 12,
    maxWidth: 140,
  },
});

