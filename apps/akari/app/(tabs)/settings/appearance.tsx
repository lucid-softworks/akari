import React, { useCallback, useState } from 'react';
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

const HEX_REGEX = /^#[0-9A-Fa-f]{6}$/;

type ColorRowProps = {
  label: string;
  currentColor: string;
  onColorChange: (color: string | null) => void;
  borderColor: string;
  showDivider?: boolean;
};

function ColorRow({ label, currentColor, onColorChange, borderColor, showDivider = true }: ColorRowProps) {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState(currentColor);
  const textColor = useThemeColor({}, 'text');

  const handleSubmit = useCallback(() => {
    setEditing(false);
    if (HEX_REGEX.test(inputValue)) {
      onColorChange(inputValue);
    } else {
      setInputValue(currentColor);
    }
  }, [inputValue, currentColor, onColorChange]);

  return (
    <TouchableOpacity
      style={[styles.colorRow, showDivider && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: borderColor }]}
      onPress={() => {
        setInputValue(currentColor);
        setEditing(true);
      }}
      activeOpacity={0.7}
    >
      <View style={[styles.colorPreview, { backgroundColor: currentColor }]} />
      <ThemedText style={styles.colorLabel}>{label}</ThemedText>
      {editing ? (
        <TextInput
          style={[styles.colorInput, { color: textColor, borderColor }]}
          value={inputValue}
          onChangeText={setInputValue}
          onBlur={handleSubmit}
          onSubmitEditing={handleSubmit}
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={7}
          placeholder="#000000"
          placeholderTextColor="#999"
        />
      ) : (
        <ThemedText style={styles.colorValue}>{currentColor}</ThemedText>
      )}
    </TouchableOpacity>
  );
}

type ColorKeys = keyof typeof Colors.light;
const COLOR_FIELDS: { key: ColorKeys; label: string }[] = [
  { key: 'background', label: 'Background' },
  { key: 'text', label: 'Text' },
  { key: 'tint', label: 'Tint' },
  { key: 'icon', label: 'Icons' },
  { key: 'border', label: 'Borders' },
];

export default function AppearanceSettingsScreen() {
  const borderColor = useBorderColor();
  const { t } = useTranslation();
  const theme = useColorScheme() ?? 'light';
  const { config, setAccentColor, setModeColor, resetToDefaults } = useThemeConfig();

  const currentAccent = config.accentColor;
  const hasCustomizations = !!(config.accentColor || config.light || config.dark);

  const getEffectiveColor = useCallback((mode: 'light' | 'dark', key: ColorKeys): string => {
    return config[mode]?.[key] ?? Colors[mode][key];
  }, [config]);

  return (
    <SettingsSubpageLayout title={t('settings.appearance')}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
        keyboardShouldPersistTaps="handled"
      >
        {/* Accent Color */}
        <SettingsSection isFirst title="Accent Color">
          <ThemedView style={[styles.sectionCard, { borderColor }]}>
            <View style={styles.swatchGrid}>
              <TouchableOpacity
                style={[styles.swatchButton, !currentAccent && styles.swatchSelected, { borderColor: !currentAccent ? Colors.light.tint : 'transparent' }]}
                onPress={() => setAccentColor(null)}
              >
                <View style={[styles.swatch, { backgroundColor: Colors.light.tint }]}>
                  {!currentAccent ? <IconSymbol name="checkmark" size={16} color="#fff" /> : null}
                </View>
                <ThemedText style={styles.swatchLabel}>Default</ThemedText>
              </TouchableOpacity>

              {ACCENT_PRESETS.map((preset) => {
                const isSelected = currentAccent === preset.color;
                return (
                  <TouchableOpacity
                    key={preset.color}
                    style={[styles.swatchButton, isSelected && styles.swatchSelected, { borderColor: isSelected ? preset.color : 'transparent' }]}
                    onPress={() => setAccentColor(preset.color)}
                  >
                    <View style={[styles.swatch, { backgroundColor: preset.color }]}>
                      {isSelected ? <IconSymbol name="checkmark" size={16} color="#fff" /> : null}
                    </View>
                    <ThemedText style={styles.swatchLabel}>{preset.label}</ThemedText>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ThemedView>
        </SettingsSection>

        {/* Current Mode Colors */}
        <SettingsSection title={`${theme === 'dark' ? 'Dark' : 'Light'} Mode Colors`}>
          <ThemedView style={[styles.sectionCard, { borderColor, padding: 0 }]}>
            {COLOR_FIELDS.map((field, index) => (
              <ColorRow
                key={field.key}
                label={field.label}
                currentColor={getEffectiveColor(theme, field.key)}
                onColorChange={(color) => setModeColor(theme, field.key, color)}
                borderColor={borderColor}
                showDivider={index < COLOR_FIELDS.length - 1}
              />
            ))}
          </ThemedView>
        </SettingsSection>

        {/* Other Mode Colors */}
        <SettingsSection title={`${theme === 'dark' ? 'Light' : 'Dark'} Mode Colors`}>
          <ThemedView style={[styles.sectionCard, { borderColor, padding: 0 }]}>
            {COLOR_FIELDS.map((field, index) => {
              const otherMode = theme === 'dark' ? 'light' : 'dark';
              return (
                <ColorRow
                  key={field.key}
                  label={field.label}
                  currentColor={getEffectiveColor(otherMode, field.key)}
                  onColorChange={(color) => setModeColor(otherMode, field.key, color)}
                  borderColor={borderColor}
                  showDivider={index < COLOR_FIELDS.length - 1}
                />
              );
            })}
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
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  colorPreview: {
    width: 24,
    height: 24,
    borderRadius: radius.xs,
    borderWidth: layout.hairline,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  colorLabel: {
    flex: 1,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
  },
  colorValue: {
    fontSize: fontSize.base,
    opacity: 0.6,
    fontFamily: 'Menlo',
  },
  colorInput: {
    fontSize: fontSize.base,
    fontFamily: 'Menlo',
    borderWidth: 1,
    borderRadius: radius.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    width: 90,
    textAlign: 'center',
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
