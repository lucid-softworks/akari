import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';

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
import { useModerationSettings } from '@/hooks/useModerationSettings';
import { useNotImplementedToast } from '@/hooks/useNotImplementedToast';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

export default function ModerationSettingsScreen() {
  const borderColor = useBorderColor();
  const iconColor = useThemeColor({}, 'text');
  const subduedColor = useThemeColor({ light: '#6B7280', dark: '#9BA1A6' }, 'text');
  const showNotImplemented = useNotImplementedToast();
  const { t } = useTranslation();
  const { adultContentEnabled, setAdultContentEnabled } = useModerationSettings();

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
        onPress: () => router.push('/(tabs)/settings/muted-words'),
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
        onPress: () => router.push('/(tabs)/settings/verification'),
      },
    ],
    [showNotImplemented, t],
  );

  return (
    <SettingsSubpageLayout title={t('settings.moderation')}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        <SettingsSection isFirst>
          <ThemedView style={[styles.sectionCard, { borderColor }]}>
            {moderationRows.map((item) => (
              <SettingsRow
                key={item.key}
                borderColor={borderColor}
                description={item.description}
                icon={item.icon}
                label={item.label}
                onPress={item.onPress}
                showDivider
              />
            ))}
            <ThemedView style={styles.toggleRow}>
              <IconSymbol
                color={iconColor}
                name="eye.fill"
                size={20}
                style={styles.toggleIcon}
              />
              <View style={styles.toggleLabelWrap}>
                <ThemedText style={styles.toggleLabel}>
                  {t('settings.enableAdultContent')}
                </ThemedText>
                <ThemedText style={[styles.toggleHint, { color: subduedColor }]}>
                  {t('settings.enableAdultContentHint')}
                </ThemedText>
              </View>
              <Switch value={adultContentEnabled} onValueChange={setAdultContentEnabled} />
            </ThemedView>
          </ThemedView>
        </SettingsSection>

        <ThemedView style={[styles.noticeCard, { borderColor }]}>
          <ThemedText style={styles.noticeTitle}>{t('settings.moderationServices')}</ThemedText>
          <ThemedText style={styles.noticeBody}>{t('settings.notImplemented')}</ThemedText>
        </ThemedView>
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
  },
  toggleIcon: {
    marginRight: 12,
  },
  toggleLabelWrap: {
    flex: 1,
    paddingRight: 12,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  toggleHint: {
    fontSize: 12,
    marginTop: 2,
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
