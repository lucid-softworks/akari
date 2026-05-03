import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Switch } from 'react-native';

import {
  SettingsRow,
  SettingsSection,
  type SettingsRowDescriptor,
} from '@/components/settings/SettingsList';
import { SettingsSubpageLayout } from '@/components/settings/SettingsSubpageLayout';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useFeedSettings } from '@/hooks/useFeedSettings';
import { useNotImplementedToast } from '@/hooks/useNotImplementedToast';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

export default function ContentAndMediaScreen() {
  const borderColor = useBorderColor();
  const iconColor = useThemeColor({}, 'text');
  const showNotImplemented = useNotImplementedToast();
  const { t } = useTranslation();
  const { trendingBarEnabled, setTrendingBarEnabled } = useFeedSettings();

  const contentRows = useMemo<SettingsRowDescriptor[]>(
    () => [
      {
        key: 'saved-feeds',
        icon: 'bookmark.fill',
        label: t('settings.manageSavedFeeds'),
        onPress: showNotImplemented,
      },
      {
        key: 'thread-preferences',
        icon: 'text.bubble.fill',
        label: t('settings.threadPreferences'),
        onPress: showNotImplemented,
      },
      {
        key: 'external-media',
        icon: 'rectangle.stack.fill',
        label: t('settings.externalMedia'),
        onPress: showNotImplemented,
      },
      {
        key: 'autoplay',
        icon: 'play.circle.fill',
        label: t('settings.autoplayVideos'),
        onPress: showNotImplemented,
      },
    ],
    [showNotImplemented, t],
  );

  return (
    <SettingsSubpageLayout title={t('settings.contentAndMedia')}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        <SettingsSection isFirst>
          <ThemedView style={[styles.sectionCard, { borderColor }]}>
            <ThemedView style={[styles.toggleRow, { borderBottomColor: borderColor }]}>
              <IconSymbol color={iconColor} name="flame" size={20} style={styles.toggleIcon} />
              <ThemedText style={styles.toggleLabel}>{t('settings.trendingBar')}</ThemedText>
              <Switch value={trendingBarEnabled} onValueChange={setTrendingBarEnabled} />
            </ThemedView>
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
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'transparent',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
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

