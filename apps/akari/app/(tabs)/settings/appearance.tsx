import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';

import {
  SettingsRow,
  SettingsSection,
  type SettingsRowDescriptor,
} from '@/components/settings/SettingsList';
import { SettingsSubpageLayout } from '@/components/settings/SettingsSubpageLayout';
import { SettingsScroll } from '@/components/settings/SettingsScroll';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { AppLogo } from '@/components/AppLogo';
import { SwatchPicker, PRESETS } from '@/components/settings/ColorSwatchPicker';
import { Colors } from '@/constants/Colors';
import { spacing, radius, fontSize as fontSizeTokens, fontWeight, semanticColors } from '@/constants/tokens';
import { useBorderColor } from '@/hooks/useBorderColor';
import {
  useLogoVariant,
  useSetLogoVariant,
  type LogoVariant,
} from '@/hooks/useLogoSetting';
import {
  useThemeConfig,
  type ColorMode,
  type DarkVariant,
  type FontFamily,
  type FontSize,
} from '@/hooks/useThemeConfig';
import { useTranslation } from '@/hooks/useTranslation';

const MODE_ICONS: Record<ColorMode, React.ComponentProps<typeof IconSymbol>['name']> = {
  light: 'sun.max.fill',
  auto: 'iphone',
  dark: 'moon.fill',
};

export default function AppearanceSettingsScreen() {
  const borderColor = useBorderColor();
  const { t } = useTranslation();
  const { config, setAccentColor, setColorMode, setDarkVariant, setFont, setFontSize, resetToDefaults } =
    useThemeConfig();

  const logoVariant = useLogoVariant();
  const setLogoVariant = useSetLogoVariant();

  const colorMode: ColorMode = config.colorMode ?? 'auto';
  const darkVariant: DarkVariant = config.darkVariant ?? 'dark';
  const font: FontFamily = config.font ?? 'theme';
  const fontSize: FontSize = config.fontSize ?? 'default';
  const accentColor = config.accentColor ?? Colors.light.tint;
  const hasCustomizations = !!(
    config.accentColor ||
    config.light ||
    config.dark ||
    config.colorMode ||
    config.darkVariant ||
    config.font ||
    config.fontSize
  );

  const colorRows: SettingsRowDescriptor[] = [
    {
      key: 'light-colors',
      icon: 'sun.max.fill',
      label: t('settings.lightModeColors'),
      onPress: () => router.push('/(tabs)/settings/appearance-light'),
    },
    {
      key: 'dark-colors',
      icon: 'moon.fill',
      label: t('settings.darkModeColors'),
      onPress: () => router.push('/(tabs)/settings/appearance-dark'),
    },
  ];

  return (
    <SettingsSubpageLayout title={t('settings.appearance')}>
      <SettingsScroll
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
        keyboardShouldPersistTaps="handled"
      >
        {/* Color Mode */}
        <SettingsSection isFirst title={t('settings.colorMode')}>
          <ThemedView style={[styles.modeSelector, { borderColor }]}>
            {(['auto', 'light', 'dark'] as ColorMode[]).map((mode) => {
              const active = colorMode === mode;
              const label =
                mode === 'light'
                  ? t('settings.lightMode')
                  : mode === 'dark'
                    ? t('settings.darkMode')
                    : t('settings.systemMode');
              return (
                <Pressable
                  key={mode}
                  style={({ pressed }) => [
                    styles.modeOption,
                    active && { backgroundColor: accentColor },
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={() => setColorMode(mode)}
                >
                  <IconSymbol name={MODE_ICONS[mode]} size={16} color={active ? '#fff' : borderColor} />
                  <ThemedText style={[styles.modeOptionText, active && styles.modeOptionTextActive]}>
                    {label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ThemedView>
        </SettingsSection>

        {/* Dark theme variant */}
        <SettingsSection title={t('settings.darkTheme')}>
          <ThemedView style={[styles.modeSelector, { borderColor }]}>
            {(['dim', 'dark'] as DarkVariant[]).map((variant) => {
              const active = darkVariant === variant;
              const label = variant === 'dim' ? t('settings.darkThemeDim') : t('settings.darkThemeDark');
              return (
                <Pressable
                  key={variant}
                  style={({ pressed }) => [
                    styles.modeOption,
                    active && { backgroundColor: accentColor },
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={() => setDarkVariant(variant)}
                >
                  <ThemedText style={[styles.modeOptionText, active && styles.modeOptionTextActive]}>
                    {label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ThemedView>
        </SettingsSection>

        {/* Font */}
        <SettingsSection title={t('settings.font')}>
          <ThemedText style={styles.fontHint}>{t('settings.fontHint')}</ThemedText>
          <ThemedView style={[styles.modeSelector, { borderColor }]}>
            {(['system', 'theme'] as FontFamily[]).map((option) => {
              const active = font === option;
              const label = option === 'system' ? t('settings.fontSystem') : t('settings.fontTheme');
              return (
                <Pressable
                  key={option}
                  style={({ pressed }) => [
                    styles.modeOption,
                    active && { backgroundColor: accentColor },
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={() => setFont(option)}
                >
                  <ThemedText style={[styles.modeOptionText, active && styles.modeOptionTextActive]}>
                    {label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ThemedView>
        </SettingsSection>

        {/* Font size */}
        <SettingsSection title={t('settings.fontSize')}>
          <ThemedView style={[styles.modeSelector, { borderColor }]}>
            {(['smaller', 'default', 'larger'] as FontSize[]).map((option) => {
              const active = fontSize === option;
              const label =
                option === 'smaller'
                  ? t('settings.fontSizeSmaller')
                  : option === 'larger'
                    ? t('settings.fontSizeLarger')
                    : t('settings.fontSizeDefault');
              return (
                <Pressable
                  key={option}
                  style={({ pressed }) => [
                    styles.modeOption,
                    active && { backgroundColor: accentColor },
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={() => setFontSize(option)}
                >
                  <ThemedText style={[styles.modeOptionText, active && styles.modeOptionTextActive]}>
                    {label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ThemedView>
        </SettingsSection>

        {/* App Logo */}
        <SettingsSection title={t('settings.appLogo')}>
          <ThemedView style={[styles.logoOptions, { borderColor }]}>
            {(['default', 'classic'] as LogoVariant[]).map((variant, index) => {
              const active = logoVariant === variant;
              const label = variant === 'default' ? t('settings.appLogoDefault') : t('settings.appLogoClassic');
              return (
                <Pressable
                  key={variant}
                  style={({ pressed }) => [
                    styles.logoOption,
                    index > 0 && { borderLeftColor: borderColor, borderLeftWidth: 1 },
                    active && { backgroundColor: `${accentColor}22` },
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={() => setLogoVariant(variant)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <AppLogo variant={variant} style={styles.logoPreview} />
                  <ThemedText style={[styles.logoLabel, active && { color: accentColor, fontWeight: fontWeight.semibold }]}>
                    {label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ThemedView>
        </SettingsSection>

        {/* Accent Color */}
        <SettingsSection title={t('settings.accentColor')}>
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
        <SettingsSection title={t('settings.colors')}>
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
            <Pressable
              style={({ pressed }) => [styles.resetButton, { borderColor }, pressed && { opacity: 0.7 }]}
              onPress={resetToDefaults}
            >
              <ThemedText style={styles.resetText}>{t('settings.resetToDefaults')}</ThemedText>
            </Pressable>
          </SettingsSection>
        ) : null}
      </SettingsScroll>
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
    fontSize: fontSizeTokens.base,
    fontWeight: fontWeight.medium,
  },
  modeOptionTextActive: {
    color: '#fff',
    fontWeight: fontWeight.semibold,
  },
  fontHint: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xs,
    fontSize: fontSizeTokens.sm,
    opacity: 0.7,
  },
  logoOptions: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  logoOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  logoPreview: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
  },
  logoLabel: {
    fontSize: fontSizeTokens.sm,
    fontWeight: fontWeight.medium,
  },
  sectionCard: {
    marginHorizontal: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    backgroundColor: 'transparent',
  },
  linkCard: {
    marginHorizontal: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'transparent',
  },
  resetButton: {
    marginHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
  },
  resetText: {
    fontSize: fontSizeTokens.base,
    color: semanticColors.danger,
    fontWeight: fontWeight.semibold,
  },
});
