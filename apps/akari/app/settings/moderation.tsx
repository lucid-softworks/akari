import React, { useMemo } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import {
  SettingsRow,
  SettingsSection,
  type SettingsRowDescriptor,
} from '@/components/settings/SettingsList';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useNotImplementedToast } from '@/hooks/useNotImplementedToast';
import { useTranslation } from '@/hooks/useTranslation';

export default function ModerationSettingsScreen() {
  const borderColor = useBorderColor();
  const showNotImplemented = useNotImplementedToast();
  const { t } = useTranslation();

  const moderationRows = useMemo<SettingsRowDescriptor[]>(
    () => [
      {
        key: 'interaction-settings',
        icon: 'person.crop.circle.badge.checkmark',
        label: t('settings.interactionSettings'),
        onPress: showNotImplemented,
      },
      {
        key: 'muted-words',
        icon: 'text.badge.minus',
        label: t('settings.mutedWordsTags'),
        onPress: showNotImplemented,
      },
      {
        key: 'muted-accounts',
        icon: 'speaker.slash.fill',
        label: t('settings.mutedAccounts'),
        onPress: showNotImplemented,
      },
      {
        key: 'blocked-accounts',
        icon: 'hand.raised.fill',
        label: t('settings.blockedAccounts'),
        onPress: showNotImplemented,
      },
      {
        key: 'verification',
        icon: 'checkmark.seal.fill',
        label: t('settings.verificationSettings'),
        onPress: showNotImplemented,
      },
      {
        key: 'adult-content',
        icon: 'eye.fill',
        label: t('settings.enableAdultContent'),
        onPress: showNotImplemented,
      },
    ],
    [showNotImplemented, t],
  );

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <SettingsSection isFirst title={t('settings.moderation')}>
          <ThemedView style={[styles.sectionCard, { borderColor }]}> 
            {moderationRows.map((item, index) => (
              <SettingsRow
                key={item.key}
                borderColor={borderColor}
                description={item.description}
                icon={item.icon}
                label={item.label}
                onPress={item.onPress}
                showDivider={index < moderationRows.length - 1}
              />
            ))}
          </ThemedView>
        </SettingsSection>

        <ThemedView style={[styles.noticeCard, { borderColor }]}> 
          <ThemedText style={styles.noticeTitle}>{t('settings.moderationServices')}</ThemedText>
          <ThemedText style={styles.noticeBody}>{t('settings.notImplemented')}</ThemedText>
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
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

