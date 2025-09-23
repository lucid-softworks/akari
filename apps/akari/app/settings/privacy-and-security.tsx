import React, { useMemo } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import {
  SettingsRow,
  SettingsSection,
  type SettingsRowDescriptor,
} from '@/components/settings/SettingsList';
import { SettingsHeader } from '@/components/settings/SettingsHeader';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useNotImplementedToast } from '@/hooks/useNotImplementedToast';
import { useTranslation } from '@/hooks/useTranslation';

export default function PrivacyAndSecurityScreen() {
  const borderColor = useBorderColor();
  const showNotImplemented = useNotImplementedToast();
  const { t } = useTranslation();

  const privacyRows = useMemo<SettingsRowDescriptor[]>(
    () => [
      {
        key: 'two-factor',
        icon: 'lock.shield.fill',
        label: t('settings.twoFactor'),
        onPress: showNotImplemented,
      },
      {
        key: 'app-passwords',
        icon: 'key.fill',
        label: t('settings.appPasswords'),
        onPress: showNotImplemented,
      },
      {
        key: 'notify-others',
        icon: 'bell.badge.fill',
        label: t('settings.notifyOthers'),
        onPress: showNotImplemented,
      },
      {
        key: 'logged-out',
        icon: 'eye.slash.fill',
        label: t('settings.loggedOutVisibility'),
        description: t('settings.loggedOutVisibilityDescription'),
        onPress: showNotImplemented,
      },
    ],
    [showNotImplemented, t],
  );

  return (
    <ThemedView style={styles.container}>
      <SettingsHeader title={t('settings.privacyAndSecurity')} />
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        <SettingsSection isFirst>
          <ThemedView style={[styles.sectionCard, { borderColor }]}> 
            {privacyRows.map((item, index) => (
              <SettingsRow
                key={item.key}
                borderColor={borderColor}
                description={item.description}
                icon={item.icon}
                label={item.label}
                onPress={item.onPress}
                showDivider={index < privacyRows.length - 1}
              />
            ))}
          </ThemedView>
        </SettingsSection>

        <ThemedView style={[styles.noticeCard, { borderColor }]}> 
          <ThemedText style={styles.noticeTitle}>{t('settings.loggedOutVisibility')}</ThemedText>
          <ThemedText style={styles.noticeBody}>{t('settings.loggedOutVisibilityDescription')}</ThemedText>
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
  noticeCard: {
    marginHorizontal: 16,
    marginTop: 24,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  noticeBody: {
    fontSize: 14,
    opacity: 0.75,
    lineHeight: 20,
  },
});

