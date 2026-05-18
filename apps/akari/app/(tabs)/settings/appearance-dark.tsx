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

export default function AppearanceDarkScreen() {
  const borderColor = useBorderColor();
  const { config, setModeColor } = useThemeConfig();
  const { t } = useTranslation();

  const fields = [
    { key: 'background' as const, label: t('settings.background'), presets: PRESETS.background.dark },
    { key: 'panel' as const, label: t('settings.panel'), presets: PRESETS.panel.dark },
    { key: 'text' as const, label: t('settings.textColor'), presets: PRESETS.text.dark },
    { key: 'textSecondary' as const, label: t('settings.textSecondary'), presets: PRESETS.textSecondary.dark },
    { key: 'textTertiary' as const, label: t('settings.textTertiary'), presets: PRESETS.textTertiary.dark },
    { key: 'icon' as const, label: t('settings.icons'), presets: PRESETS.icon.dark },
    { key: 'border' as const, label: t('settings.borders'), presets: PRESETS.border.dark },
    { key: 'lineSoft' as const, label: t('settings.softLine'), presets: PRESETS.lineSoft.dark },
    { key: 'accentDim' as const, label: t('settings.accentWash'), presets: PRESETS.accentDim.dark },
  ];

  return (
    <SettingsSubpageLayout title={t('settings.darkModeColors')}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* oxlint-disable-next-line react-doctor/rn-no-scrollview-mapped-list -- Bounded 4-element list, virtualization overhead > scan cost */}
        {fields.map((field, index) => (
          <SettingsSection key={field.key} isFirst={index === 0} title={field.label}>
            <ThemedView style={[styles.sectionCard, { borderColor }]}>
              <SwatchPicker
                presets={field.presets}
                defaultColor={Colors.dark[field.key]}
                currentColor={config.dark?.[field.key]}
                onSelect={(c) => setModeColor('dark', field.key, c)}
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
