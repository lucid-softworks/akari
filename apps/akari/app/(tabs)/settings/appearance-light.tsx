import React from 'react';
import { StyleSheet } from 'react-native';

import { SettingsSection } from '@/components/settings/SettingsList';
import { SettingsSubpageLayout } from '@/components/settings/SettingsSubpageLayout';
import { SettingsScroll } from '@/components/settings/SettingsScroll';
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
    { key: 'panel' as const, label: t('settings.panel'), presets: PRESETS.panel.light },
    { key: 'text' as const, label: t('settings.textColor'), presets: PRESETS.text.light },
    { key: 'textSecondary' as const, label: t('settings.textSecondary'), presets: PRESETS.textSecondary.light },
    { key: 'textTertiary' as const, label: t('settings.textTertiary'), presets: PRESETS.textTertiary.light },
    { key: 'icon' as const, label: t('settings.icons'), presets: PRESETS.icon.light },
    { key: 'border' as const, label: t('settings.borders'), presets: PRESETS.border.light },
    { key: 'lineSoft' as const, label: t('settings.softLine'), presets: PRESETS.lineSoft.light },
    { key: 'accentDim' as const, label: t('settings.accentWash'), presets: PRESETS.accentDim.light },
  ];

  return (
    <SettingsSubpageLayout title={t('settings.lightModeColors')}>
      <SettingsScroll
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
                defaultColor={Colors.light[field.key]}
                currentColor={config.light?.[field.key]}
                onSelect={(c) => setModeColor('light', field.key, c)}
                borderColor={borderColor}
              />
            </ThemedView>
          </SettingsSection>
        ))}
      </SettingsScroll>
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
