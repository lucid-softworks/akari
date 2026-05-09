import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { LanguageSelector } from '@/components/LanguageSelector';
import { SettingsSection } from '@/components/settings/SettingsList';
import { SettingsSubpageLayout } from '@/components/settings/SettingsSubpageLayout';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { fontSize, fontWeight, spacing } from '@/constants/tokens';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useNotImplementedToast } from '@/hooks/useNotImplementedToast';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

export default function LanguagesSettingsScreen() {
  const borderColor = useBorderColor();
  const subduedColor = useThemeColor({ light: '#6B7280', dark: '#9BA1A6' }, 'text');
  const showNotImplemented = useNotImplementedToast();
  const { t } = useTranslation();

  return (
    <SettingsSubpageLayout title={t('settings.language')}>
      <ScrollView
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
          <Pressable
            onPress={showNotImplemented}
            style={({ pressed }) => [
              styles.dropdownRow,
              { borderColor },
              pressed && { opacity: 0.7 },
            ]}
            accessibilityRole="button"
          >
            <ThemedText style={styles.dropdownLabel}>{t('common.unknown')}</ThemedText>
            <IconSymbol name="chevron.down" size={16} color={subduedColor} />
          </Pressable>
        </SettingsSection>

        <SettingsSection title={t('settings.contentLanguages')}>
          <ThemedText style={[styles.hint, { color: subduedColor }]}>
            {t('settings.contentLanguagesHint')}
          </ThemedText>
          <ThemedView style={[styles.sectionCard, { borderColor }]}>
            <View style={styles.contentLangRow}>
              <ThemedText style={[styles.contentLangLabel, { color: subduedColor }]}>
                {t('settings.notImplemented')}
              </ThemedText>
            </View>
            <Pressable
              onPress={showNotImplemented}
              style={({ pressed }) => [
                styles.addLangRow,
                { borderTopColor: borderColor },
                pressed && { opacity: 0.7 },
              ]}
              accessibilityRole="button"
            >
              <IconSymbol name="plus" size={16} color={subduedColor} />
              <ThemedText style={[styles.addLangLabel, { color: subduedColor }]}>
                {t('settings.addMoreLanguages')}
              </ThemedText>
            </Pressable>
          </ThemedView>
        </SettingsSection>
      </ScrollView>
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
    marginTop: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'transparent',
  },
  dropdownRow: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
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
