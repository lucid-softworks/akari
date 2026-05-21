import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { GuestSignInRequired } from '@/components/GuestSignInRequired';
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
import { useIsGuest } from '@/hooks/queries/useIsGuest';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useModerationSettings } from '@/hooks/useModerationSettings';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

export default function ModerationSettingsScreen() {
  const borderColor = useBorderColor();
  const iconColor = useThemeColor({}, 'text');
  const subduedColor = useThemeColor({ light: '#6B7280', dark: '#9BA1A6' }, 'text');
  const { t } = useTranslation();
  const isGuest = useIsGuest();
  const { adultContentEnabled, setAdultContentEnabled } = useModerationSettings();

  const moderationRows = useMemo<SettingsRowDescriptor[]>(
    () => [
      {
        key: 'interaction-settings',
        icon: 'person.crop.circle.badge.checkmark',
        label: t('settings.interactionSettings'),
        onPress: () => router.push('/(tabs)/settings/interaction'),
      },
      {
        key: 'muted-words',
        icon: 'text.badge.minus',
        label: t('settings.mutedWordsTags'),
        onPress: () => router.push('/(tabs)/settings/muted-words'),
      },
      {
        key: 'moderation-lists',
        icon: 'person.3.fill',
        label: t('settings.moderationLists'),
        onPress: () => router.push('/(tabs)/settings/moderation-lists'),
      },
      {
        key: 'muted-accounts',
        icon: 'speaker.slash.fill',
        label: t('settings.mutedAccounts'),
        onPress: () => router.push('/(tabs)/settings/muted-accounts'),
      },
      {
        key: 'blocked-accounts',
        icon: 'hand.raised.fill',
        label: t('settings.blockedAccounts'),
        onPress: () => router.push('/(tabs)/settings/blocked-accounts'),
      },
      {
        key: 'verification',
        icon: 'checkmark.seal.fill',
        label: t('settings.verificationSettings'),
        onPress: () => router.push('/(tabs)/settings/verification'),
      },
    ],
    [t],
  );

  if (isGuest) {
    return <GuestSignInRequired title={t('settings.moderation')} />;
  }

  return (
    <SettingsSubpageLayout title={t('settings.moderation')}>
      <SettingsScroll
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        <SettingsSection isFirst>
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

        <SettingsSection>
          <ThemedView style={[styles.sectionCard, { borderColor }]}>
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

        <SettingsSection title={t('settings.moderationServices')}>
          <ThemedView style={[styles.sectionCard, { borderColor }]}>
            <SettingsRow
              borderColor={borderColor}
              icon="shield.checkered"
              label={t('settings.moderationServices')}
              description={t('settings.moderationServicesIntro')}
              onPress={() => router.push('/(tabs)/settings/moderation-services')}
              showDivider
            />
            <SettingsRow
              borderColor={borderColor}
              icon="rectangle.connected.to.line.below"
              label={t('settings.ozoneLabeler.title')}
              description={t('settings.ozoneLabeler.entryDescription')}
              onPress={() => router.push('/(tabs)/settings/moderation-ozone')}
              showDivider={false}
            />
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
});
