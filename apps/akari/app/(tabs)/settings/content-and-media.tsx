import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { StyleSheet, Switch } from 'react-native';

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
import { useBorderColor } from '@/hooks/useBorderColor';
import { useFeedSettings } from '@/hooks/useFeedSettings';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

export default function ContentAndMediaScreen() {
  const borderColor = useBorderColor();
  const iconColor = useThemeColor({}, 'text');
  const { t } = useTranslation();
  const {
    trendingBarEnabled,
    setTrendingBarEnabled,
    trendingVideosEnabled,
    setTrendingVideosEnabled,
    videoAutoplayEnabled,
    setVideoAutoplayEnabled,
  } = useFeedSettings();

  const contentRows = useMemo<SettingsRowDescriptor[]>(
    () => [
      {
        key: 'saved-feeds',
        icon: 'bookmark.fill',
        label: t('settings.manageSavedFeeds'),
        onPress: () => router.push('/(tabs)/settings/manage-saved-feeds'),
      },
      {
        key: 'thread-preferences',
        icon: 'text.bubble.fill',
        label: t('settings.threadPreferences'),
        onPress: () => router.push('/(tabs)/settings/thread-preferences'),
      },
      {
        key: 'following-feed-preferences',
        icon: 'house.fill',
        label: t('settings.followingFeedPreferences'),
        onPress: () => router.push('/(tabs)/settings/following-feed-preferences'),
      },
      {
        key: 'external-media',
        icon: 'rectangle.stack.fill',
        label: t('settings.externalMedia'),
        onPress: () => router.push('/(tabs)/settings/external-media'),
      },
      {
        key: 'your-interests',
        icon: 'info.circle.fill',
        label: t('settings.yourInterests'),
        onPress: () => router.push('/(tabs)/settings/your-interests'),
      },
      {
        key: 'hidden-content',
        icon: 'eye.slash',
        label: t('settings.hiddenContent'),
        onPress: () => router.push('/(tabs)/settings/hidden-content'),
      },
    ],
    [t],
  );

  return (
    <SettingsSubpageLayout title={t('settings.contentAndMedia')}>
      <SettingsScroll
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        <SettingsSection isFirst>
          <ThemedView style={[styles.sectionCard, { borderColor }]}>
            {contentRows.map((item, index) => (
              <SettingsRow
                key={item.key}
                borderColor={borderColor}
                icon={item.icon}
                label={item.label}
                onPress={item.onPress}
                showDivider={index < contentRows.length - 1}
              />
            ))}
          </ThemedView>
        </SettingsSection>

        <SettingsSection>
          <ThemedView style={[styles.sectionCard, { borderColor }]}>
            <ThemedView style={[styles.toggleRow, { borderBottomColor: borderColor }]}>
              <IconSymbol
                color={iconColor}
                name="play.circle.fill"
                size={20}
                style={styles.toggleIcon}
              />
              <ThemedText style={styles.toggleLabel}>{t('settings.autoplayVideos')}</ThemedText>
              <Switch value={videoAutoplayEnabled} onValueChange={setVideoAutoplayEnabled} />
            </ThemedView>
          </ThemedView>
        </SettingsSection>

        <SettingsSection>
          <ThemedView style={[styles.sectionCard, { borderColor }]}>
            <ThemedView style={[styles.toggleRow, { borderBottomColor: borderColor }]}>
              <IconSymbol color={iconColor} name="flame" size={20} style={styles.toggleIcon} />
              <ThemedText style={styles.toggleLabel}>{t('settings.enableTrendingTopics')}</ThemedText>
              <Switch value={trendingBarEnabled} onValueChange={setTrendingBarEnabled} />
            </ThemedView>
            <ThemedView style={styles.toggleRow}>
              <IconSymbol color={iconColor} name="play.rectangle.fill" size={20} style={styles.toggleIcon} />
              <ThemedText style={styles.toggleLabel}>{t('settings.enableTrendingVideos')}</ThemedText>
              <Switch value={trendingVideosEnabled} onValueChange={setTrendingVideosEnabled} />
            </ThemedView>
          </ThemedView>
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
    paddingBottom: 32,
  },
  sectionCard: {
    marginHorizontal: 16,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'transparent',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  toggleIcon: {
    marginRight: 12,
  },
  toggleLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
});
