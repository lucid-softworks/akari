import React, { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { spacing, radius, fontSize, fontWeight } from '@/constants/tokens';
import { useTranslation } from '@/hooks/useTranslation';

const HEX_REGEX = /^#[0-9A-Fa-f]{6}$/;

function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150;
}

type SwatchPickerProps = {
  presets: { label: string; color: string }[];
  defaultColor: string;
  currentColor: string | undefined;
  onSelect: (color: string | null) => void;
  borderColor: string;
};

export function SwatchPicker({ presets, defaultColor, currentColor, onSelect, borderColor }: SwatchPickerProps) {
  const { t } = useTranslation();
  const [showCustom, setShowCustom] = useState(false);
  const [customHex, setCustomHex] = useState('');
  const isDefault = !currentColor;
  const isCustom = currentColor && !presets.some((p) => p.color === currentColor) && currentColor !== defaultColor;

  return (
    <View style={styles.swatchGrid}>
      <Pressable
        style={({ pressed }) => [styles.swatchButton, isDefault && styles.swatchSelected, { borderColor: isDefault ? defaultColor : 'transparent' }, pressed && { opacity: 0.7 }]}
        onPress={() => { onSelect(null); setShowCustom(false); }}
      >
        <View style={[styles.swatch, { backgroundColor: defaultColor, borderColor }]}>
          {isDefault ? <IconSymbol name="checkmark" size={14} color={isLightColor(defaultColor) ? '#000' : '#fff'} /> : null}
        </View>
        <ThemedText style={styles.swatchLabel}>{t('settings.default')}</ThemedText>
      </Pressable>

      {presets.map((preset) => {
        const selected = currentColor === preset.color;
        return (
          <Pressable
            key={preset.color}
            style={({ pressed }) => [styles.swatchButton, selected && styles.swatchSelected, { borderColor: selected ? preset.color : 'transparent' }, pressed && { opacity: 0.7 }]}
            onPress={() => { onSelect(preset.color); setShowCustom(false); }}
          >
            <View style={[styles.swatch, { backgroundColor: preset.color, borderColor }]}>
              {selected ? <IconSymbol name="checkmark" size={14} color={isLightColor(preset.color) ? '#000' : '#fff'} /> : null}
            </View>
            <ThemedText style={styles.swatchLabel}>{preset.label}</ThemedText>
          </Pressable>
        );
      })}

      <Pressable
        style={({ pressed }) => [styles.swatchButton, (showCustom || isCustom) && styles.swatchSelected, { borderColor: isCustom ? currentColor : showCustom ? borderColor : 'transparent' }, pressed && { opacity: 0.7 }]}
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
        <ThemedText style={styles.swatchLabel}>{t('settings.custom')}</ThemedText>
      </Pressable>

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
            // oxlint-disable-next-line jsx-a11y/no-autofocus -- custom-color picker opens specifically to capture a hex code, focus prevents an extra tap
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={7}
            placeholder="#RRGGBB"
            placeholderTextColor="#999"
          />
          <Pressable
            style={({ pressed }) => [styles.customApply, { backgroundColor: HEX_REGEX.test(customHex) ? (customHex || '#999') : '#ccc' }, pressed && { opacity: 0.7 }]}
            onPress={() => {
              if (HEX_REGEX.test(customHex)) {
                onSelect(customHex);
                setShowCustom(false);
              }
            }}
          >
            <ThemedText style={styles.customApplyText}>{t('settings.apply')}</ThemedText>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

export const PRESETS = {
  accent: [
    { label: 'Blue', color: '#007AFF' },
    { label: 'Purple', color: '#AF52DE' },
    { label: 'Pink', color: '#FF69B4' },
    { label: 'Red', color: '#FF3B30' },
    { label: 'Orange', color: '#FF9500' },
    { label: 'Green', color: '#34C759' },
    { label: 'Teal', color: '#5AC8FA' },
    { label: 'Indigo', color: '#5856D6' },
  ],
  background: {
    light: [
      { label: 'White', color: '#FFFFFF' },
      { label: 'Warm', color: '#FFFBF5' },
      { label: 'Cool', color: '#F5F7FA' },
      { label: 'Cream', color: '#FDF6EC' },
      { label: 'Mint', color: '#F0FFF4' },
    ],
    dark: [
      { label: 'Dark', color: '#0b0c0e' },
      { label: 'Black', color: '#000000' },
      { label: 'Navy', color: '#0F1729' },
      { label: 'Charcoal', color: '#1C1C1E' },
      { label: 'Slate', color: '#1E293B' },
    ],
  },
  text: {
    light: [
      { label: 'Dark', color: '#11181C' },
      { label: 'Black', color: '#000000' },
      { label: 'Soft', color: '#374151' },
      { label: 'Warm', color: '#292524' },
    ],
    dark: [
      { label: 'Light', color: '#eceef1' },
      { label: 'White', color: '#FFFFFF' },
      { label: 'Soft', color: '#D1D5DB' },
      { label: 'Warm', color: '#FDE68A' },
    ],
  },
  icon: {
    light: [
      { label: 'Gray', color: '#687076' },
      { label: 'Dark', color: '#374151' },
      { label: 'Soft', color: '#9CA3AF' },
      { label: 'Blue', color: '#3B82F6' },
    ],
    dark: [
      { label: 'Gray', color: '#9a9ca3' },
      { label: 'Light', color: '#D1D5DB' },
      { label: 'Soft', color: '#6B7280' },
      { label: 'Blue', color: '#60A5FA' },
    ],
  },
  border: {
    light: [
      { label: 'Light', color: '#E1E3E5' },
      { label: 'Soft', color: '#F0F0F0' },
      { label: 'Medium', color: '#D1D5DB' },
      { label: 'Warm', color: '#E5E0DB' },
    ],
    dark: [
      { label: 'Dark', color: '#1b1c20' },
      { label: 'Subtle', color: '#1F2937' },
      { label: 'Medium', color: '#374151' },
      { label: 'Navy', color: '#1E293B' },
    ],
  },
  panel: {
    light: [
      { label: 'Panel', color: '#F7F9FB' },
      { label: 'White', color: '#FFFFFF' },
      { label: 'Cool', color: '#F3F5F8' },
      { label: 'Warm', color: '#FAFBFD' },
    ],
    dark: [
      { label: 'Panel', color: '#0e0f12' },
      { label: 'Raised', color: '#15161a' },
      { label: 'Flat', color: '#0b0c0e' },
      { label: 'Slate', color: '#161A22' },
    ],
  },
  lineSoft: {
    light: [
      { label: 'Soft', color: '#EEF0F2' },
      { label: 'Subtle', color: '#F3F5F7' },
      { label: 'Faint', color: '#E5E7EB' },
      { label: 'Warm', color: '#EDEAE5' },
    ],
    dark: [
      { label: 'Soft', color: '#161719' },
      { label: 'Subtle', color: '#15161a' },
      { label: 'Mid', color: '#1b1c20' },
      { label: 'Navy', color: '#1E293B' },
    ],
  },
  textSecondary: {
    light: [
      { label: 'Slate', color: '#4B5563' },
      { label: 'Gray', color: '#6B7280' },
      { label: 'Dark', color: '#374151' },
      { label: 'Soft', color: '#9CA3AF' },
    ],
    dark: [
      { label: 'Gray', color: '#9a9ca3' },
      { label: 'Light', color: '#AEB0B7' },
      { label: 'Mid', color: '#8B8D94' },
      { label: 'Cool', color: '#9BA1A6' },
    ],
  },
  textTertiary: {
    light: [
      { label: 'Soft', color: '#9CA3AF' },
      { label: 'Light', color: '#B0B4BB' },
      { label: 'Gray', color: '#6B7280' },
      { label: 'Warm', color: '#A8A29E' },
    ],
    dark: [
      { label: 'Dim', color: '#6b6d74' },
      { label: 'Mid', color: '#7A7C83' },
      { label: 'Deep', color: '#5C5E65' },
      { label: 'Cool', color: '#6B7280' },
    ],
  },
  accentDim: {
    light: [
      { label: 'Wash', color: '#E5EBFF' },
      { label: 'Indigo', color: '#EEF2FF' },
      { label: 'Blue', color: '#DBEAFE' },
      { label: 'Cool', color: '#EFF6FF' },
    ],
    dark: [
      { label: 'Wash', color: '#1a2236' },
      { label: 'Slate', color: '#1F2937' },
      { label: 'Indigo', color: '#1E1B4B' },
      { label: 'Deep', color: '#0F1729' },
    ],
  },
};

const styles = StyleSheet.create({
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
    borderWidth: StyleSheet.hairlineWidth,
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
});
