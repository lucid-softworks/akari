import React, { useMemo } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import {
  SettingsRow,
  SettingsSection,
  type SettingsRowDescriptor,
} from '@/components/settings/SettingsList';
import { SettingsSubpageLayout } from '@/components/settings/SettingsSubpageLayout';
import { ThemedView } from '@/components/ThemedView';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useNotImplementedToast } from '@/hooks/useNotImplementedToast';
import { useTranslation } from '@/hooks/useTranslation';

export default function ContentAndMediaScreen() {
  const borderColor = useBorderColor();
  const showNotImplemented = useNotImplementedToast();
  const { t } = useTranslation();

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
});

