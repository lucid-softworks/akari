import React, { useCallback, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { SettingsSection } from '@/components/settings/SettingsList';
import { SettingsSubpageLayout } from '@/components/settings/SettingsSubpageLayout';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import {
  activeOpacity,
  fontSize,
  fontWeight,
  layout,
  radius,
  spacing,
} from '@/constants/tokens';
import { useToast } from '@/contexts/ToastContext';
import { useUpdateContentLanguages } from '@/hooks/mutations/useUpdateContentLanguages';
import { useContentLanguages } from '@/hooks/queries/useContentLanguages';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { getAvailableLocales, getTranslationData } from '@/utils/i18n';

type LanguageOption = {
  /** BCP-47 language tag stored in atproto preferences. */
  code: string;
  /** Endonym from the locale's translation file (e.g. "Deutsch"). */
  nativeName: string;
  /** English name (e.g. "German") for sorting. */
  englishName: string;
  flag: string;
};

function buildLanguageList(): LanguageOption[] {
  const list: LanguageOption[] = [];
  for (const locale of getAvailableLocales()) {
    const meta = getTranslationData(locale);
    if (!meta?.language || !meta?.nativeName) continue;
    list.push({
      code: locale,
      nativeName: meta.nativeName,
      englishName: meta.language,
      flag: meta.flag ?? '',
    });
  }
  return list.sort((a, b) => a.englishName.localeCompare(b.englishName));
}

export default function ContentLanguagesScreen() {
  const borderColor = useBorderColor();
  const subduedColor = useThemeColor({ light: '#6B7280', dark: '#9BA1A6' }, 'text');
  const accentColor = useThemeColor({ light: '#7C8CF9', dark: '#7C8CF9' }, 'tint');
  const textColor = useThemeColor({}, 'text');
  const { t } = useTranslation();
  const { showToast } = useToast();

  const selected = useContentLanguages();
  const update = useUpdateContentLanguages();

  // Set lookup is faster than an Array.includes per row.
  const selectedSet = useMemo(() => new Set(selected.data), [selected.data]);
  const languages = useMemo(() => buildLanguageList(), []);

  const handleToggle = useCallback(
    (code: string) => {
      update.mutate(
        (current) => {
          const set = new Set(current);
          if (set.has(code)) set.delete(code);
          else set.add(code);
          return Array.from(set);
        },
        {
          onError: () =>
            showToast({ type: 'error', message: t('settings.contentLanguagesSaveFailed') }),
        },
      );
    },
    [showToast, t, update],
  );

  return (
    <SettingsSubpageLayout title={t('settings.contentLanguages')}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        <ThemedText style={[styles.intro, { color: subduedColor }]}>
          {t('settings.contentLanguagesHint')}
        </ThemedText>

        <SettingsSection>
          <ThemedView style={[styles.sectionCard, { borderColor }]}>
            {languages.map((lang, index) => {
              const isSelected = selectedSet.has(lang.code);
              return (
                <Pressable
                  key={lang.code}
                  onPress={() => handleToggle(lang.code)}
                  disabled={update.isPending}
                  style={({ pressed }) => [
                    styles.row,
                    index < languages.length - 1 && {
                      borderBottomColor: borderColor,
                      borderBottomWidth: layout.hairline,
                    },
                    pressed && { opacity: activeOpacity.default },
                    update.isPending && styles.disabled,
                  ]}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isSelected }}
                >
                  <ThemedText style={styles.flag}>{lang.flag}</ThemedText>
                  <View style={styles.text}>
                    <ThemedText style={[styles.nativeName, { color: textColor }]}>
                      {lang.nativeName}
                    </ThemedText>
                    <ThemedText style={[styles.englishName, { color: subduedColor }]}>
                      {lang.englishName}
                    </ThemedText>
                  </View>
                  {isSelected ? (
                    <IconSymbol name="checkmark.circle.fill" size={22} color={accentColor} />
                  ) : (
                    <IconSymbol name="circle" size={22} color={subduedColor} />
                  )}
                </Pressable>
              );
            })}
          </ThemedView>
        </SettingsSection>
      </ScrollView>
    </SettingsSubpageLayout>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  contentContainer: { paddingBottom: spacing.xxl },
  intro: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  sectionCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderWidth: layout.hairline,
    backgroundColor: 'transparent',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  flag: {
    fontSize: 22,
  },
  text: {
    flex: 1,
  },
  nativeName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  englishName: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  disabled: {
    opacity: 0.5,
  },
});
