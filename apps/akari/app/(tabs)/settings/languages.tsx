import { router } from 'expo-router';
import React, { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { LanguageSelector } from '@/components/LanguageSelector';
import { SettingsSection } from '@/components/settings/SettingsList';
import { SettingsSubpageLayout } from '@/components/settings/SettingsSubpageLayout';
import { SettingsScroll } from '@/components/settings/SettingsScroll';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Menu, MenuTrigger, type MenuItem } from '@/components/ui/Menu';
import { fontSize, fontWeight, spacing } from '@/constants/tokens';
import { useToast } from '@/contexts/ToastContext';
import { useUpdateContentLanguages } from '@/hooks/mutations/useUpdateContentLanguages';
import { useContentLanguages } from '@/hooks/queries/useContentLanguages';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { getAvailableLocales, getTranslationData } from '@/utils/i18n';

export default function LanguagesSettingsScreen() {
  const borderColor = useBorderColor();
  const subduedColor = useThemeColor({ light: '#6B7280', dark: '#9BA1A6' }, 'text');
  const { t } = useTranslation();
  const { showToast } = useToast();
  const contentLanguages = useContentLanguages();
  const updateContentLanguages = useUpdateContentLanguages();

  // Resolve the codes to short native names so the row reads "Deutsch,
  // 日本語" instead of "de, ja". Falls back to the raw code when the
  // metadata lookup misses.
  const contentLanguagesSummary = useMemo(() => {
    if (contentLanguages.data.length === 0) return t('settings.contentLanguagesEmpty');
    return contentLanguages.data
      .map((code) => getTranslationData(code)?.nativeName ?? code)
      .join(', ');
  }, [contentLanguages.data, t]);

  // Primary language is whatever sits at position 0 of the content
  // languages list — that's the convention atproto feeds use to filter
  // by the user's preferred posting language.
  const primaryLanguageCode = contentLanguages.data[0];
  const primaryLanguageLabel = primaryLanguageCode
    ? getTranslationData(primaryLanguageCode)?.nativeName ?? primaryLanguageCode
    : t('settings.primaryLanguageNone');

  const handlePrimarySelect = useCallback(
    (code: string) => {
      updateContentLanguages.mutate(
        (current) => [code, ...current.filter((c) => c !== code)],
        {
          onError: () =>
            showToast({ type: 'error', message: t('common.somethingWentWrong') }),
        },
      );
    },
    [updateContentLanguages, showToast, t],
  );

  const primaryLanguageItems = useMemo<MenuItem[]>(
    () =>
      getAvailableLocales()
        .flatMap((code) => {
          const meta = getTranslationData(code);
          if (!meta?.nativeName) return [];
          return [
            {
              key: code,
              label: `${meta.flag ?? ''} ${meta.nativeName}`.trim(),
              selected: code === primaryLanguageCode,
              onPress: () => handlePrimarySelect(code),
            } as MenuItem,
          ];
        })
        .sort((a, b) => a.label.localeCompare(b.label)),
    [handlePrimarySelect, primaryLanguageCode],
  );

  return (
    <SettingsSubpageLayout title={t('settings.language')}>
      <SettingsScroll
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        <SettingsSection isFirst title={t('settings.appLanguage')}>
          <ThemedText style={[styles.hint, { color: subduedColor }]}>
            {t('settings.appLanguageHint')}
          </ThemedText>
          <ThemedView style={[styles.sectionCard, { borderColor, overflow: 'hidden' }]}>
            <LanguageSelector />
          </ThemedView>
        </SettingsSection>

        <SettingsSection title={t('settings.primaryLanguage')}>
          <ThemedText style={[styles.hint, { color: subduedColor }]}>
            {t('settings.primaryLanguageHint')}
          </ThemedText>
          <Menu items={primaryLanguageItems} estimatedHeight={420}>
            <MenuTrigger
              style={({ pressed }) => [
                styles.dropdownRow,
                { borderColor },
                pressed && { opacity: 0.7 },
              ]}
            >
              <ThemedText style={styles.dropdownLabel}>{primaryLanguageLabel}</ThemedText>
              <IconSymbol name="chevron.down" size={16} color={subduedColor} />
            </MenuTrigger>
          </Menu>
        </SettingsSection>

        <SettingsSection title={t('settings.contentLanguages')}>
          <ThemedText style={[styles.hint, { color: subduedColor }]}>
            {t('settings.contentLanguagesHint')}
          </ThemedText>
          <Pressable
            onPress={() => router.push('/(tabs)/settings/content-languages')}
            style={({ pressed }) => [
              styles.dropdownRow,
              { borderColor },
              pressed && { opacity: 0.7 },
            ]}
            accessibilityRole="button"
          >
            <ThemedText style={styles.dropdownLabel} numberOfLines={1}>
              {contentLanguagesSummary}
            </ThemedText>
            <IconSymbol name="chevron.right" size={16} color={subduedColor} />
          </Pressable>
        </SettingsSection>
      </SettingsScroll>
    </SettingsSubpageLayout>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: spacing.xxl,
  },
  hint: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xs,
    fontSize: fontSize.sm,
    lineHeight: 18,
  },
  sectionCard: {
    marginHorizontal: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'transparent',
  },
  dropdownRow: {
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  contentLangRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  contentLangLabel: {
    fontSize: fontSize.sm,
  },
  addLangRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  addLangLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
});
