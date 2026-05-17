import { StyleSheet } from 'react-native';

import {
  SettingsRow,
  SettingsSection,
  type SettingsRowDescriptor,
} from '@/components/settings/SettingsList';
import { ThemedView } from '@/components/ThemedView';
import { spacing } from '@/constants/tokens';

type SettingsRowsSectionProps = {
  title: string;
  rows: SettingsRowDescriptor[];
  borderColor: string;
};

/**
 * Generic section card that renders a list of SettingsRow descriptors
 * with dividers between them. Used by the account screen for the
 * Actions, Account details, and Account security sections.
 */
export function SettingsRowsSection({ title, rows, borderColor }: SettingsRowsSectionProps) {
  return (
    <SettingsSection title={title}>
      <ThemedView style={[styles.sectionCard, { borderColor }]}>
        {rows.map((item, index) => (
          <SettingsRow
            key={item.key}
            borderColor={borderColor}
            description={item.description}
            destructive={item.destructive}
            icon={item.icon}
            label={item.label}
            onPress={item.onPress}
            showDivider={index < rows.length - 1}
          />
        ))}
      </ThemedView>
    </SettingsSection>
  );
}

const styles = StyleSheet.create({
  sectionCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'transparent',
  },
});
