import React from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { SettingsSection } from '@/components/settings/SettingsList';
import { SettingsSubpageLayout } from '@/components/settings/SettingsSubpageLayout';
import { SettingsScroll } from '@/components/settings/SettingsScroll';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { fontSize, fontWeight, layout, spacing } from '@/constants/tokens';
import { useExternalMediaSettings } from '@/hooks/useExternalMediaSettings';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

export default function ExternalMediaScreen() {
  const borderColor = useBorderColor();
  const iconColor = useThemeColor({}, 'text');
  const subduedColor = useThemeColor({ light: '#6B7280', dark: '#9BA1A6' }, 'text');
  const { t } = useTranslation();
  const {
    youtubeEnabled,
    gifEnabled,
    setYoutubeEnabled,
    setGifEnabled,
  } = useExternalMediaSettings();

  return (
    <SettingsSubpageLayout title={t('settings.externalMedia')}>
      <SettingsScroll
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        <ThemedText style={[styles.intro, { color: subduedColor }]}>
          {t('settings.externalMediaIntro')}
        </ThemedText>

        <SettingsSection>
          <ThemedView style={[styles.sectionCard, { borderColor }]}>
            <View style={[styles.toggleRow, { borderBottomColor: borderColor, borderBottomWidth: layout.hairline }]}>
              <IconSymbol color={iconColor} name="play.rectangle.fill" size={20} style={styles.toggleIcon} />
              <ThemedText style={styles.toggleLabel}>{t('settings.externalMediaYoutube')}</ThemedText>
              <Switch value={youtubeEnabled} onValueChange={setYoutubeEnabled} />
            </View>
            <View style={styles.toggleRow}>
              <IconSymbol color={iconColor} name="photo.on.rectangle.angled" size={20} style={styles.toggleIcon} />
              <ThemedText style={styles.toggleLabel}>{t('settings.externalMediaGif')}</ThemedText>
              <Switch value={gifEnabled} onValueChange={setGifEnabled} />
            </View>
          </ThemedView>
        </SettingsSection>
      </SettingsScroll>
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
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  toggleIcon: {
    marginRight: spacing.md,
  },
  toggleLabel: {
    flex: 1,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
});
