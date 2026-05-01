import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { SettingsSection } from '@/components/settings/SettingsList';
import { SettingsSubpageLayout } from '@/components/settings/SettingsSubpageLayout';
import { ThemedView } from '@/components/ThemedView';
import { SwatchPicker, PRESETS } from '@/components/settings/ColorSwatchPicker';
import { Colors } from '@/constants/Colors';
import { spacing } from '@/constants/tokens';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeConfig } from '@/hooks/useThemeConfig';
import { useTranslation } from '@/hooks/useTranslation';

export default function AppearanceLightScreen() {
  const borderColor = useBorderColor();
  const { config, setModeColor } = useThemeConfig();
  const { t } = useTranslation();

  const fields = [
    { key: 'background' as const, label: t('settings.background'), presets: PRESETS.background.light },
    { key: 'text' as const, label: t('settings.textColor'), presets: PRESETS.text.light },
    { key: 'icon' as const, label: t('settings.icons'), presets: PRESETS.icon.light },
    { key: 'border' as const, label: t('settings.borders'), presets: PRESETS.border.light },
  ];

  return (
    <SettingsSubpageLayout title={t('settings.lightModeColors')}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {fields.map((field, index) => (
          <SettingsSection key={field.key} isFirst={index === 0} title={field.label}>
            <ThemedView style={[styles.sectionCard, { borderColor }]}>
              <SwatchPicker
                presets={field.presets}
                defaultColor={Colors.light[field.key]}
                currentColor={config.light?.[field.key]}
                onSelect={(c) => setModeColor('light', field.key, c)}
                borderColor={borderColor}
              />
            </ThemedView>
          </SettingsSection>
        ))}
      </ScrollView>
    </SettingsSubpageLayout>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    paddingBottom: 32,
  },
  sectionCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    backgroundColor: 'transparent',
  },
});
