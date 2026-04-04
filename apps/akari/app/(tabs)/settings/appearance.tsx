import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { SettingsSection } from '@/components/settings/SettingsList';
import { SettingsSubpageLayout } from '@/components/settings/SettingsSubpageLayout';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { spacing, radius, fontSize, fontWeight, semanticColors } from '@/constants/tokens';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeConfig } from '@/hooks/useThemeConfig';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

const ACCENT_PRESETS = [
  { label: 'Blue', color: '#007AFF' },
  { label: 'Purple', color: '#AF52DE' },
  { label: 'Pink', color: '#FF2D55' },
  { label: 'Red', color: '#FF3B30' },
  { label: 'Orange', color: '#FF9500' },
  { label: 'Green', color: '#34C759' },
  { label: 'Teal', color: '#5AC8FA' },
  { label: 'Indigo', color: '#5856D6' },
];

const DEFAULT_TINT_LIGHT = Colors.light.tint;
const DEFAULT_TINT_DARK = Colors.dark.tint;

export default function AppearanceSettingsScreen() {
  const borderColor = useBorderColor();
  const { t } = useTranslation();
  const { config, setAccentColor, resetToDefaults } = useThemeConfig();
  const secondaryText = useThemeColor({ light: '#6B7280', dark: '#9BA1A6' }, 'text');
  const cardBg = useThemeColor({}, 'background');

  const currentAccent = config.accentColor;
  const hasCustomizations = !!(config.accentColor || config.light || config.dark);

  return (
    <SettingsSubpageLayout title={t('settings.appearance')}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        {/* Accent Color */}
        <SettingsSection isFirst title="Accent Color">
          <ThemedView style={[styles.sectionCard, { borderColor }]}>
            <View style={styles.swatchGrid}>
              {/* Default option */}
              <TouchableOpacity
                style={[
                  styles.swatchButton,
                  !currentAccent && styles.swatchSelected,
                  { borderColor: !currentAccent ? DEFAULT_TINT_LIGHT : borderColor },
                ]}
                onPress={() => setAccentColor(null)}
              >
                <View style={[styles.swatch, { backgroundColor: DEFAULT_TINT_LIGHT }]}>
                  {!currentAccent ? (
                    <IconSymbol name="checkmark" size={16} color="#fff" />
                  ) : null}
                </View>
                <ThemedText style={styles.swatchLabel}>Default</ThemedText>
              </TouchableOpacity>

              {ACCENT_PRESETS.map((preset) => {
                const isSelected = currentAccent === preset.color;
                return (
                  <TouchableOpacity
                    key={preset.color}
                    style={[
                      styles.swatchButton,
                      isSelected && styles.swatchSelected,
                      { borderColor: isSelected ? preset.color : borderColor },
                    ]}
                    onPress={() => setAccentColor(preset.color)}
                  >
                    <View style={[styles.swatch, { backgroundColor: preset.color }]}>
                      {isSelected ? (
                        <IconSymbol name="checkmark" size={16} color="#fff" />
                      ) : null}
                    </View>
                    <ThemedText style={styles.swatchLabel}>{preset.label}</ThemedText>
                  </TouchableOpacity>
                );
              })}
            </View>
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
  sectionCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    backgroundColor: 'transparent',
  },
  swatchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  swatchButton: {
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: 'transparent',
    width: 72,
  },
  swatchSelected: {
    borderWidth: 2,
  },
  swatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
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
