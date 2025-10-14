import React, { useMemo } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { NotificationSettings } from '@/components/NotificationSettings';
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

export default function NotificationSettingsScreen() {
  const borderColor = useBorderColor();
  const showNotImplemented = useNotImplementedToast();
  const { t } = useTranslation();

  const stubRows = useMemo<SettingsRowDescriptor[]>(
    () => [
      {
        key: 'notification-categories',
        icon: 'bell.badge',
        label: t('settings.notificationCategories'),
        description: t('settings.notImplemented'),
        onPress: showNotImplemented,
      },
    ],
    [showNotImplemented, t],
  );

  return (
    <SettingsSubpageLayout title={t('settings.notifications')}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        <SettingsSection isFirst>
          <ThemedView style={[styles.sectionCard, { borderColor, overflow: 'hidden' }]}>
            <NotificationSettings />
          </ThemedView>
        </SettingsSection>

        <SettingsSection title={t('common.actions')}>
          <ThemedView style={[styles.sectionCard, { borderColor }]}>
            {stubRows.map((item, index) => (
              <SettingsRow
                key={item.key}
                borderColor={borderColor}
                description={item.description}
                icon={item.icon}
                label={item.label}
                onPress={item.onPress}
                showDivider={index < stubRows.length - 1}
                accessory={item.accessory}
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

