import React, { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import { SettingsSection } from '@/components/settings/SettingsList';
import { SettingsSubpageLayout } from '@/components/settings/SettingsSubpageLayout';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { spacing, radius, fontSize, fontWeight, semanticColors, layout } from '@/constants/tokens';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeConfig, type ColorMode } from '@/hooks/useThemeConfig';
import { useTranslation } from '@/hooks/useTranslation';

const ACCENT_PRESETS = [
  { label: 'Blue', color: '#007AFF' },
  { label: 'Purple', color: '#AF52DE' },
  { label: 'Pink', color: '#FF69B4' },
  { label: 'Red', color: '#FF3B30' },
  { label: 'Orange', color: '#FF9500' },
  { label: 'Green', color: '#34C759' },
  { label: 'Teal', color: '#5AC8FA' },
  { label: 'Indigo', color: '#5856D6' },
];

const BACKGROUND_PRESETS_LIGHT = [
  { label: 'White', color: '#FFFFFF' },
  { label: 'Warm', color: '#FFFBF5' },
  { label: 'Cool', color: '#F5F7FA' },
  { label: 'Cream', color: '#FDF6EC' },
  { label: 'Mint', color: '#F0FFF4' },
];

const BACKGROUND_PRESETS_DARK = [
  { label: 'Dark', color: '#151718' },
  { label: 'Black', color: '#000000' },
  { label: 'Navy', color: '#0F1729' },
  { label: 'Charcoal', color: '#1C1C1E' },
  { label: 'Slate', color: '#1E293B' },
];

const TEXT_PRESETS_LIGHT = [
  { label: 'Dark', color: '#11181C' },
  { label: 'Black', color: '#000000' },
  { label: 'Soft', color: '#374151' },
  { label: 'Warm', color: '#292524' },
];

const TEXT_PRESETS_DARK = [
  { label: 'Light', color: '#ECEDEE' },
  { label: 'White', color: '#FFFFFF' },
  { label: 'Soft', color: '#D1D5DB' },
  { label: 'Warm', color: '#FDE68A' },
];

const ICON_PRESETS_LIGHT = [
  { label: 'Gray', color: '#687076' },
  { label: 'Dark', color: '#374151' },
  { label: 'Soft', color: '#9CA3AF' },
  { label: 'Blue', color: '#3B82F6' },
];

const ICON_PRESETS_DARK = [
  { label: 'Gray', color: '#9BA1A6' },
  { label: 'Light', color: '#D1D5DB' },
  { label: 'Soft', color: '#6B7280' },
  { label: 'Blue', color: '#60A5FA' },
];

const BORDER_PRESETS_LIGHT = [
  { label: 'Light', color: '#E1E3E5' },
  { label: 'Soft', color: '#F0F0F0' },
  { label: 'Medium', color: '#D1D5DB' },
  { label: 'Warm', color: '#E5E0DB' },
];

const BORDER_PRESETS_DARK = [
  { label: 'Dark', color: '#2A2D2E' },
  { label: 'Subtle', color: '#1F2937' },
  { label: 'Medium', color: '#374151' },
  { label: 'Navy', color: '#1E293B' },
];

const HEX_REGEX = /^#[0-9A-Fa-f]{6}$/;

type ColorKeys = keyof typeof Colors.light;

type SwatchPickerProps = {
  presets: { label: string; color: string }[];
  defaultColor: string;
  currentColor: string | undefined;
  onSelect: (color: string | null) => void;
  borderColor: string;
};

function SwatchPicker({ presets, defaultColor, currentColor, onSelect, borderColor }: SwatchPickerProps) {
  const [showCustom, setShowCustom] = useState(false);
  const [customHex, setCustomHex] = useState('');
  const isDefault = !currentColor;
  const isCustom = currentColor && !presets.some((p) => p.color === currentColor) && currentColor !== defaultColor;

  return (
    <View style={styles.swatchGrid}>
      {/* Default */}
      <TouchableOpacity
        style={[styles.swatchButton, isDefault && styles.swatchSelected, { borderColor: isDefault ? defaultColor : 'transparent' }]}
        onPress={() => { onSelect(null); setShowCustom(false); }}
      >
        <View style={[styles.swatch, { backgroundColor: defaultColor }]}>
          {isDefault ? <IconSymbol name="checkmark" size={14} color="#fff" /> : null}
        </View>
        <ThemedText style={styles.swatchLabel}>Default</ThemedText>
      </TouchableOpacity>

      {/* Presets */}
      {presets.map((preset) => {
        const selected = currentColor === preset.color;
        return (
          <TouchableOpacity
            key={preset.color}
            style={[styles.swatchButton, selected && styles.swatchSelected, { borderColor: selected ? preset.color : 'transparent' }]}
            onPress={() => { onSelect(preset.color); setShowCustom(false); }}
          >
            <View style={[styles.swatch, { backgroundColor: preset.color }]}>
              {selected ? <IconSymbol name="checkmark" size={14} color={isLightColor(preset.color) ? '#000' : '#fff'} /> : null}
            </View>
            <ThemedText style={styles.swatchLabel}>{preset.label}</ThemedText>
          </TouchableOpacity>
        );
      })}

      {/* Custom */}
      <TouchableOpacity
        style={[styles.swatchButton, (showCustom || isCustom) && styles.swatchSelected, { borderColor: isCustom ? currentColor : showCustom ? borderColor : 'transparent' }]}
        onPress={() => {
          setCustomHex(isCustom && currentColor ? currentColor : '');
          setShowCustom(true);
        }}
      >
        <View style={[styles.swatch, styles.customSwatch, isCustom ? { backgroundColor: currentColor } : { borderColor }]}>
          {isCustom ? (
            <IconSymbol name="checkmark" size={14} color={isLightColor(currentColor!) ? '#000' : '#fff'} />
          ) : (
            <IconSymbol name="pencil" size={14} color="#999" />
          )}
        </View>
        <ThemedText style={styles.swatchLabel}>Custom</ThemedText>
      </TouchableOpacity>

      {/* Custom hex input */}
      {showCustom ? (
        <View style={styles.customInputRow}>
          <TextInput
            style={[styles.customInput, { borderColor }]}
            value={customHex}
            onChangeText={setCustomHex}
            onSubmitEditing={() => {
              if (HEX_REGEX.test(customHex)) {
                onSelect(customHex);
                setShowCustom(false);
              }
            }}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={7}
            placeholder="#RRGGBB"
            placeholderTextColor="#999"
          />
          <TouchableOpacity
            style={[styles.customApply, { backgroundColor: HEX_REGEX.test(customHex) ? (customHex || '#999') : '#ccc' }]}
            onPress={() => {
              if (HEX_REGEX.test(customHex)) {
                onSelect(customHex);
                setShowCustom(false);
              }
            }}
          >
            <ThemedText style={styles.customApplyText}>Apply</ThemedText>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150;
}

type ModeColorSectionsProps = {
  mode: 'light' | 'dark';
  config: ReturnType<typeof useThemeConfig>['config'];
  setModeColor: ReturnType<typeof useThemeConfig>['setModeColor'];
  borderColor: string;
};

function ModeColorSections({ mode, config, setModeColor, borderColor }: ModeColorSectionsProps) {
  const isDark = mode === 'dark';
  const fields: { key: ColorKeys; label: string; presets: { label: string; color: string }[] }[] = [
    { key: 'background', label: 'Background', presets: isDark ? BACKGROUND_PRESETS_DARK : BACKGROUND_PRESETS_LIGHT },
    { key: 'text', label: 'Text', presets: isDark ? TEXT_PRESETS_DARK : TEXT_PRESETS_LIGHT },
    { key: 'icon', label: 'Icons', presets: isDark ? ICON_PRESETS_DARK : ICON_PRESETS_LIGHT },
    { key: 'border', label: 'Borders', presets: isDark ? BORDER_PRESETS_DARK : BORDER_PRESETS_LIGHT },
  ];

  return (
    <>
      {fields.map((field) => (
        <SettingsSection key={field.key} title={field.label}>
          <ThemedView style={[styles.sectionCard, { borderColor }]}>
            <SwatchPicker
              presets={field.presets}
              defaultColor={Colors[mode][field.key]}
              currentColor={config[mode]?.[field.key]}
              onSelect={(c) => setModeColor(mode, field.key, c)}
              borderColor={borderColor}
            />
          </ThemedView>
        </SettingsSection>
      ))}
    </>
  );
}

export default function AppearanceSettingsScreen() {
  const borderColor = useBorderColor();
  const { t } = useTranslation();
  const theme = useColorScheme() ?? 'light';
  const { config, setAccentColor, setModeColor, setColorMode, resetToDefaults } = useThemeConfig();

  const colorMode: ColorMode = config.colorMode ?? 'auto';
  const hasCustomizations = !!(config.accentColor || config.light || config.dark || config.colorMode);
  const showLight = colorMode === 'auto' || colorMode === 'light';
  const showDark = colorMode === 'auto' || colorMode === 'dark';

  const MODE_OPTIONS: { key: ColorMode; label: string; icon: React.ComponentProps<typeof IconSymbol>['name'] }[] = [
    { key: 'light', label: 'Light', icon: 'sun.max.fill' },
    { key: 'auto', label: 'Auto', icon: 'circle.lefthalf.filled' },
    { key: 'dark', label: 'Dark', icon: 'moon.fill' },
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
              const accentColor = config.accentColor ?? Colors.light.tint;
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
              presets={ACCENT_PRESETS}
              defaultColor={Colors.light.tint}
              currentColor={config.accentColor}
              onSelect={(c) => setAccentColor(c)}
              borderColor={borderColor}
            />
          </ThemedView>
        </SettingsSection>

        {/* Light Mode Colors */}
        {showLight ? (
          <>
            <SettingsSection title="Light Mode" />
            <ModeColorSections mode="light" config={config} setModeColor={setModeColor} borderColor={borderColor} />
          </>
        ) : null}

        {/* Dark Mode Colors */}
        {showDark ? (
          <>
            <SettingsSection title="Dark Mode" />
            <ModeColorSections mode="dark" config={config} setModeColor={setModeColor} borderColor={borderColor} />
          </>
        ) : null}

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
  swatchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  swatchButton: {
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: 'transparent',
    width: 68,
  },
  swatchSelected: {
    borderWidth: 2,
  },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customSwatch: {
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  swatchLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  customInputRow: {
    flexDirection: 'row',
    width: '100%',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  customInput: {
    flex: 1,
    fontSize: fontSize.base,
    fontFamily: 'Menlo',
    borderWidth: 1,
    borderRadius: radius.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  customApply: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customApplyText: {
    color: '#fff',
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
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
