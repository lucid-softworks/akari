import { router } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import {
  SettingsRow,
  SettingsSection,
  type SettingsRowDescriptor,
} from '@/components/settings/SettingsList';
import { SettingsSubpageLayout } from '@/components/settings/SettingsSubpageLayout';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { SwatchPicker, PRESETS } from '@/components/settings/ColorSwatchPicker';
import { Colors } from '@/constants/Colors';
import { spacing, radius, fontSize, fontWeight, semanticColors } from '@/constants/tokens';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeConfig, type ColorMode } from '@/hooks/useThemeConfig';
import { useTranslation } from '@/hooks/useTranslation';

const MODE_OPTIONS: { key: ColorMode; label: string; icon: React.ComponentProps<typeof IconSymbol>['name'] }[] = [
  { key: 'light', label: 'Light', icon: 'sun.max.fill' },
  { key: 'auto', label: 'Auto', icon: 'circle.lefthalf.filled' },
  { key: 'dark', label: 'Dark', icon: 'moon.fill' },
];

export default function AppearanceSettingsScreen() {
  const borderColor = useBorderColor();
  const { t } = useTranslation();
  const { config, setAccentColor, setColorMode, resetToDefaults } = useThemeConfig();

  const colorMode: ColorMode = config.colorMode ?? 'auto';
  const accentColor = config.accentColor ?? Colors.light.tint;
  const hasCustomizations = !!(config.accentColor || config.light || config.dark || config.colorMode);

  const colorRows: SettingsRowDescriptor[] = [
    {
      key: 'light-colors',
      icon: 'sun.max.fill',
      label: 'Light Mode Colors',
      onPress: () => router.push('/(tabs)/settings/appearance-light'),
    },
    {
      key: 'dark-colors',
      icon: 'moon.fill',
      label: 'Dark Mode Colors',
      onPress: () => router.push('/(tabs)/settings/appearance-dark'),
    },
  ];

  return (
    <SettingsSubpageLayout title={t('settings.appearance')}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
        keyboardShouldPersistTaps="handled"
      >
        {/* Color Mode */}
        <SettingsSection isFirst title="Color Mode">
          <ThemedView style={[styles.modeSelector, { borderColor }]}>
            {MODE_OPTIONS.map((opt) => {
              const active = colorMode === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.modeOption, active && { backgroundColor: accentColor }]}
                  onPress={() => setColorMode(opt.key)}
                >
                  <IconSymbol name={opt.icon} size={16} color={active ? '#fff' : borderColor} />
                  <ThemedText style={[styles.modeOptionText, active && styles.modeOptionTextActive]}>
                    {opt.label}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </ThemedView>
        </SettingsSection>

        {/* Accent Color */}
        <SettingsSection title="Accent Color">
          <ThemedView style={[styles.sectionCard, { borderColor }]}>
            <SwatchPicker
              presets={PRESETS.accent}
              defaultColor={Colors.light.tint}
              currentColor={config.accentColor}
              onSelect={(c) => setAccentColor(c)}
              borderColor={borderColor}
            />
          </ThemedView>
        </SettingsSection>

        {/* Mode Color Links */}
        <SettingsSection title="Colors">
          <ThemedView style={[styles.linkCard, { borderColor }]}>
            {colorRows.map((item, index) => (
              <SettingsRow
                key={item.key}
                borderColor={borderColor}
                icon={item.icon}
                label={item.label}
                onPress={item.onPress}
                showDivider={index < colorRows.length - 1}
              />
            ))}
          </ThemedView>
        </SettingsSection>

        {/* Reset */}
        {hasCustomizations ? (
          <SettingsSection>
            <TouchableOpacity
              style={[styles.resetButton, { borderColor }]}
              onPress={resetToDefaults}
            >
              <ThemedText style={styles.resetText}>Reset to Defaults</ThemedText>
            </TouchableOpacity>
          </SettingsSection>
        ) : null}
      </ScrollView>
    </SettingsSubpageLayout>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 32,
  },
  modeSelector: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  modeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  modeOptionText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  modeOptionTextActive: {
    color: '#fff',
    fontWeight: fontWeight.semibold,
  },
  sectionCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    backgroundColor: 'transparent',
  },
  linkCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'transparent',
  },
  resetButton: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
  },
  resetText: {
    fontSize: fontSize.base,
    color: semanticColors.danger,
    fontWeight: fontWeight.semibold,
  },
});
